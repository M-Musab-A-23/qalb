"""Live replay of MIT-BIH records as a stand-in for a real device feed.

A replay session walks through one record at real-time speed (or 2x, 5x),
sends the new signal samples every 250 ms and runs the classifier on the
latest 10 seconds every 2 seconds. The HTTP layer is a Server-Sent Events
stream, ``GET /live/{record}``; ``api.py`` mounts the router.

Only DS2 records are offered, so the demo never replays a record the model
was trained on.
"""
from __future__ import annotations

from typing import Callable

import numpy as np
from scipy.signal import resample_poly

from qalb_ml.config import DS2, FS, PACED_RECORDS

TICK_S = 0.25            # wall-clock seconds between sample events
ANALYSIS_S = 2.0         # wall-clock seconds between model runs
WINDOW_S = 10.0          # length of the window the model sees
MIN_WINDOW_S = 4.0       # no analysis until this much signal exists
WIRE_FS = 120            # sampling rate of the samples sent to the client
SPEEDS = (1, 2, 5)

# Demo records, all from the DS2 test patients, with what each one shows.
DEMO_RECORDS: dict[str, str] = {
    "100": "Normal sinus rhythm, rare atrial premature beats",
    "123": "Normal sinus rhythm, rare ventricular beats",
    "105": "Noisy signal with frequent ventricular beats",
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
