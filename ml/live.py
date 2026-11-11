"""Live replay of MIT-BIH records as a stand-in for a real device feed.

A replay session walks through one record at real-time speed (or 2x, 5x),
sends the new signal samples every 250 ms and runs the classifier on the
latest 10 seconds every 2 seconds. The HTTP layer is a Server-Sent Events
stream, ``GET /live/{record}``; ``api.py`` mounts the router.

Only DS2 records are offered, so the demo never replays a record the model
was trained on.
"""
from __future__ import annotations

import asyncio
import json
import time
from functools import lru_cache
from typing import AsyncIterator, Callable

import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from scipy.signal import resample_poly

from qalb_ml.config import DS2, FS, PACED_RECORDS

TICK_S = 0.25            # wall-clock seconds between sample events
ANALYSIS_S = 2.0         # wall-clock seconds between model runs
WINDOW_S = 10.0          # length of the window the model sees
MIN_WINDOW_S = 4.0       # no analysis until this much signal exists
OVERLAP_S = 1.0          # extra signal so a beat at a window edge is seen by the next one
WIRE_FS = 120            # sampling rate of the samples sent to the client
SPEEDS = (1, 2, 5)

# Demo records, all from the DS2 test patients, with what each one shows.
DEMO_RECORDS: dict[str, str] = {
    "100": "Normal sinus rhythm, rare atrial premature beats",
    "123": "Normal sinus rhythm, rare ventricular beats",
    "105": "Noisy signal with occasional ventricular beats",
    "200": "Frequent ventricular beats, bigeminy and runs",
    "221": "Irregular rhythm with ventricular beats",
    "233": "Frequent ventricular beats and couplets",
}

assert all(r in DS2 and r not in PACED_RECORDS for r in DEMO_RECORDS)


class UnknownRecord(KeyError):
    """The requested record is not one of the allowed demo records."""


def check_record(name: str) -> str:
    if name not in DEMO_RECORDS:
        raise UnknownRecord(name)
    return name


def to_wire(signal: np.ndarray, fs: int = FS, wire_fs: int = WIRE_FS) -> np.ndarray:
    """Downsample a whole record for the wire (anti-aliased, 360 Hz to 120 Hz)."""
    if fs == wire_fs:
        return np.asarray(signal, dtype=float)
    g = int(np.gcd(int(fs), int(wire_fs)))
    return resample_poly(np.asarray(signal, dtype=float), wire_fs // g, int(fs) // g)


def default_analyse(window: np.ndarray, fs: float) -> dict:
    """Run the packaged model on one window (imported late so the module loads without it)."""
    from predict import predict_window
    return predict_window(window, fs)


class ReplaySession:
    """One viewer's walk through a record.

    The session has no clock of its own: ``tick()`` advances it by one 250 ms
    step (``0.25 * speed`` seconds of signal) and returns the events for that
    step. The HTTP layer decides when to call it, so tests run without sleeping.
    """

    REFRACTORY_S = 0.15      # a beat this close to an already sent one is the same beat
    TRUTH_TOLERANCE_S = 0.1  # annotation must be this close to a detected beat
    ALERT_GAP_S = 1.0        # alerts of one type closer than this are one episode

    def __init__(self, record: str, signal, fs: int, peaks, labels, *, speed: int = 1,
                 offset_s: float = 0.0, analyse: Callable[[np.ndarray, float], dict] | None = None,
                 samples: bool = True, truth: bool = True, wire_fs: int = WIRE_FS):
        if speed not in SPEEDS:
            raise ValueError(f"speed must be one of {SPEEDS}")
        if offset_s < 0:
            raise ValueError("offset must not be negative")
        self.record = record
        self.signal = np.asarray(signal, dtype=float)
        self.fs = int(fs)
        self.peaks = np.asarray(peaks, dtype=int)
        self.labels = np.asarray(labels)
        self.speed = speed
        self.send_samples = samples
        self.truth = truth
        self.analyse = analyse or default_analyse
        self.wire_fs = wire_fs
        self.wire = to_wire(self.signal, self.fs, wire_fs)
        self.total = len(self.signal)
        if self.total < int(MIN_WINDOW_S * self.fs):
            raise ValueError("record is too short to replay")
        self.pos = int(offset_s * self.fs) % self.total
        self.origin = self.pos          # stream time is (record sample - origin) / fs
        self.loop = 0
        self.ticks = 0
        self.seq = 0
        self._last_beat = -10 ** 12
        self._episode_end: dict[str, int] = {}

    # -- time helpers -----------------------------------------------------
    @property
    def step_samples(self) -> int:
        return int(round(TICK_S * self.speed * self.fs))

    @property
    def window_samples(self) -> int:
        """Latest 10 s; longer at 5x, where consecutive windows would otherwise not overlap."""
        return int(max(WINDOW_S, ANALYSIS_S * self.speed + OVERLAP_S) * self.fs)

    @property
    def analysis_every(self) -> int:
        return max(1, int(round(ANALYSIS_S / TICK_S)))

    def stream_t(self, sample: int) -> float:
        return round((sample - self.origin) / self.fs, 3)

    def _wire_index(self, sample: int) -> int:
        return int(round(sample * self.wire_fs / self.fs))

    # -- events -----------------------------------------------------------
    def status(self, state: str, **extra) -> dict:
        return {"type": "status", "state": state, "record": self.record, "speed": self.speed,
                "t": self.stream_t(self.pos), "record_t": round(self.pos / self.fs, 3),
                "loop": self.loop, "hr_bpm": None, "rhythm": None, "quality": None, **extra}

    def _samples_event(self, start: int, end: int) -> dict:
        values = self.wire[self._wire_index(start):self._wire_index(end)]
        event = {"type": "samples", "seq": self.seq, "t": self.stream_t(start),
                 "record_t": round(start / self.fs, 3), "fs": self.wire_fs,
                 "values": [round(float(v), 3) for v in values]}
        self.seq += 1
        return event

    def tick(self) -> list[dict]:
        """Advance one step and return the events it produced, in order."""
        events: list[dict] = []
        if self.ticks == 0:
            events.append(self.status("started"))
        start = self.pos
        end = min(start + self.step_samples, self.total)
        if self.send_samples:
            events.append(self._samples_event(start, end))
        self.pos = end
        self.ticks += 1
        if self.ticks % self.analysis_every == 0:
            events.extend(self._analyse_window())
        if self.pos >= self.total:
            self.loop += 1
            self.origin -= self.total
            self.pos = 0
            self._last_beat = -10 ** 12
            self._episode_end.clear()
            events.append(self.status("loop"))
        return events

    # -- analysis ---------------------------------------------------------
    def _truth_near(self, sample: int) -> str | None:
        """Annotated class of the beat closest to ``sample``, for the demo comparison."""
        if len(self.peaks) == 0:
            return None
        i = int(np.searchsorted(self.peaks, sample))
        best, gap = None, int(self.TRUTH_TOLERANCE_S * self.fs) + 1
        for j in (i - 1, i):
            if 0 <= j < len(self.peaks) and abs(int(self.peaks[j]) - sample) < gap:
                best, gap = j, abs(int(self.peaks[j]) - sample)
        return None if best is None else str(self.labels[best])

    def _new_beats(self, result: dict, w0: int) -> list[dict]:
        refractory = int(self.REFRACTORY_S * self.fs)
        beats = []
        for b in sorted(result["beats"], key=lambda b: b["sample"]):
            sample = w0 + int(b["sample"])
            if sample <= self._last_beat + refractory:
                continue
            beat = {"t": self.stream_t(sample), "record_t": round(sample / self.fs, 3),
                    "class": b["class"], "confidence": b["confidence"]}
            if self.truth:
                beat["ground_truth"] = self._truth_near(sample)
            beats.append(beat)
            self._last_beat = sample
        return beats

    def _new_alerts(self, result: dict, w0: int) -> list[dict]:
        """Alerts that start a new episode; a pattern still in view is not repeated."""
        gap = int(self.ALERT_GAP_S * self.fs)
        events = []
        for a in result["alerts"]:
            start, end = w0 + int(a["start_sample"]), w0 + int(a["end_sample"])
            known = self._episode_end.get(a["type"])
            self._episode_end[a["type"]] = max(end, known if known is not None else end)
            if known is not None and start <= known + gap:
                continue
            events.append({"type": "alert", "id": f"{self.record}-{a['type']}-{start}",
                           "alert_type": a["type"], "severity": a["severity"],
                           "confidence": a["confidence"], "message": a["message"],
                           "t": self.stream_t(start), "end_t": self.stream_t(end),
                           "record_t": round(start / self.fs, 3)})
        return events

    def _analyse_window(self) -> list[dict]:
        w1 = self.pos
        w0 = max(0, w1 - self.window_samples)
        if w1 - w0 < int(MIN_WINDOW_S * self.fs):
            return [self.status("streaming")]
        try:
            result = self.analyse(self.signal[w0:w1], self.fs)
        except Exception as exc:  # a bad window must not end the stream
            return [self.status("streaming", warnings=[f"analysis failed: {exc}"])]
        events = []
        beats = self._new_beats(result, w0)
        if beats:
            events.append({"type": "beats", "beats": beats})
        events.extend(self._new_alerts(result, w0))
        rhythm = result["rhythm"]
        events.append(self.status(
            "streaming", hr_bpm=rhythm.get("mean_hr_bpm"), rhythm=rhythm.get("rhythm"),
            quality=result["quality"].get("score"), n_beats=rhythm.get("n_beats"),
            class_counts=rhythm.get("class_counts"), model=result.get("model"),
            warnings=result.get("warnings", [])))
        return events


# -- HTTP layer ---------------------------------------------------------------
router = APIRouter(prefix="/live", tags=["live"])


@lru_cache(maxsize=4)
def load_replay_record(name: str):
    """Signal, rate, annotated peaks and labels of one allowed record (cached)."""
    from qalb_ml.data import load_record
    return load_record(check_record(name))


def model_ready() -> bool:
    import predict
    return predict.MODEL_PATH.exists()


_WARM = False


def warm_model(signal: np.ndarray, fs: int) -> None:
    """Run the model once before the first stream so the load time (a few seconds
    for the CNN) is not spent in the middle of a replay."""
    global _WARM
    if not _WARM:
        default_analyse(np.asarray(signal[:int(WINDOW_S * fs)], dtype=float), fs)
        _WARM = True


def encode_event(event: dict) -> str:
    """One Server-Sent Events message; the type lives inside the JSON."""
    return f"data: {json.dumps(event, separators=(',', ':'))}\n\n"


async def _no_wait(_seconds: float) -> None:
    return None


async def event_stream(session: ReplaySession, ticks: int = 0, sleep=None) -> AsyncIterator[str]:
    """Drive a session at its real-time pace; ``ticks`` > 0 stops after that many steps."""
    sleep = sleep or asyncio.sleep
    deadline = time.monotonic()
    done = 0
    while ticks <= 0 or done < ticks:
        for event in await asyncio.to_thread(session.tick):
            yield encode_event(event)
        done += 1
        deadline += TICK_S
        await sleep(max(0.0, deadline - time.monotonic()))


def parse_speed(value: float) -> int:
    if value not in SPEEDS:
        raise HTTPException(status_code=422, detail=f"speed must be one of {', '.join(map(str, SPEEDS))}")
    return int(value)


@router.get("/records")
def list_records() -> dict:
    """The demo records a viewer may replay."""
    return {"records": [{"record": name, "label": label, "fs": FS}
                        for name, label in DEMO_RECORDS.items()],
            "speeds": list(SPEEDS), "wire_fs": WIRE_FS}


@router.get("/{record}")
async def stream_record(record: str, speed: float = 1, offset: float = 0, samples: bool = True,
                        truth: bool = True, ticks: int = 0) -> StreamingResponse:
    """Server-Sent Events replay of one record.

    ``speed`` is 1, 2 or 5; ``offset`` is where in the record to start (seconds);
    ``samples=false`` leaves out the signal; ``truth=false`` leaves out the
    annotated labels; ``ticks`` stops the stream after that many 250 ms steps.
    """
    if record not in DEMO_RECORDS:
        raise HTTPException(status_code=404, detail=f"Unknown record '{record}'.")
    step = parse_speed(speed)
    if offset < 0:
        raise HTTPException(status_code=422, detail="offset must not be negative")
    if not model_ready():
        raise HTTPException(status_code=503, detail="Model not available on the server.")
    try:
        signal, fs, peaks, labels = await asyncio.to_thread(load_replay_record, record)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Record {record} could not be loaded: {exc}")
    try:
        await asyncio.to_thread(warm_model, signal, fs)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"The model could not be loaded: {exc}")
    session = ReplaySession(record, signal, fs, peaks, labels, speed=step, offset_s=offset,
                            samples=samples, truth=truth)
    return StreamingResponse(
        event_stream(session, ticks), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})
