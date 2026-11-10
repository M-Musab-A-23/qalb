"""Beat classification and window analysis.

    from predict import predict_beats, predict_window

``predict_beats(signal, fs)`` returns one record per detected beat.
``predict_window(signal, fs)`` returns the full result (beats, rhythm summary,
alerts, signal quality, disclaimer) as plain JSON-serialisable Python types.

Command-line demo that streams a MIT-BIH record in windows:

    python predict.py --record 100 --seconds 60
"""
from __future__ import annotations

import argparse
import sys
import time
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np

from qalb_ml.alerts import analyse_rhythm
from qalb_ml.config import CLASSES, FS, MODEL_DIR
from qalb_ml.features import window_features
from qalb_ml.preprocess import clean_signal, detect_r_peaks, resample
from qalb_ml.quality import signal_quality
from qalb_ml.schema import make_result

MODEL_PATH = MODEL_DIR / "qalb_beat_classifier.joblib"
LOW_QUALITY = 0.35


@lru_cache(maxsize=2)
def load_model(path: str | None = None) -> dict:
    p = Path(path) if path else MODEL_PATH
    if not p.exists():
        raise FileNotFoundError(
            f"Model file {p} not found. Run `python train.py` in the ml folder to create it.")
    return joblib.load(p)


def _classify(clean: np.ndarray, peaks: np.ndarray, bundle: dict):
    """Return (kept peaks at 360 Hz, class labels, confidences)."""
    X, kept = window_features(clean, peaks, FS)
    if len(kept) == 0:
        return kept, np.array([], dtype="<U1"), np.array([])
    proba = np.zeros((len(kept), len(CLASSES)))
    proba[:, list(bundle["model"].classes_)] = bundle["model"].predict_proba(X)
    idx = proba.argmax(axis=1)
    return kept, np.array(CLASSES)[idx], proba[np.arange(len(kept)), idx]


def predict_beats(signal, fs: float = FS, model_path: str | None = None) -> list[dict]:
    """Classify every detected beat in a raw ECG signal.

    Each item has ``sample`` (index into the input signal), ``time_s``,
    ``class`` and ``confidence``.
    """
    signal = np.asarray(signal, dtype=float)
    bundle = load_model(str(model_path) if model_path else None)
    clean = clean_signal(resample(signal, fs, FS), FS)
    kept, labels, conf = _classify(clean, detect_r_peaks(clean, FS), bundle)
    return _beat_records(kept, labels, conf, fs)


def _beat_records(kept, labels, conf, fs):
    return [{"sample": int(round(p * fs / FS)), "time_s": round(float(p) / FS, 3),
             "class": str(c), "confidence": round(float(q), 3)}
            for p, c, q in zip(kept, labels, conf)]


def predict_window(signal, fs: float = FS, model_path: str | None = None) -> dict:
    """Analyse one raw ECG window and return the full result schema."""
    signal = np.asarray(signal, dtype=float)
    bundle = load_model(str(model_path) if model_path else None)
    resampled = resample(signal, fs, FS)
    quality = signal_quality(resampled, FS)
    warnings = []
    if quality["score"] < LOW_QUALITY:
        warnings.append(f"Low signal quality ({quality['score']:.2f}); results are unreliable.")
    clean = clean_signal(resampled, FS)
    peaks = detect_r_peaks(clean, FS)
    kept, labels, conf = _classify(clean, peaks, bundle)
    if len(kept) == 0:
        warnings.append("No complete heartbeats were found in this window.")
    # rhythm is judged on every detected peak, labels only exist for kept ones
    summary, alerts = analyse_rhythm(kept, labels, conf, FS)
    for a in alerts:  # report alert positions in the caller's sample grid
        a["start_sample"] = int(round(a["start_sample"] * fs / FS))
        a["end_sample"] = int(round(a["end_sample"] * fs / FS))
    return make_result(
        model_name=bundle["name"], model_version=bundle["version"], fs_in=fs,
        duration_s=len(signal) / fs, beats=_beat_records(kept, labels, conf, fs),
        rhythm=summary, alerts=alerts, quality=quality, warnings=warnings)


def analyse_recording(signal, fs: float = FS, window_s: float = 60.0,
                      model_path: str | None = None) -> dict:
    """Analyse a recording of any length with the same result schema.

    Recordings up to ``window_s`` go straight to ``predict_window``. Longer
    ones are split into windows; beats and alerts are merged with sample
    indices shifted back to the full recording, and the rhythm summary is
    recomputed over all beats. ``quality`` is the mean window quality.
    """
    signal = np.asarray(signal, dtype=float)
    size = int(window_s * fs)
    if len(signal) <= size * 1.5:
        return predict_window(signal, fs, model_path)
    parts = []
    for start in range(0, len(signal), size):
        chunk = signal[start:start + size]
        if len(chunk) >= 5 * fs:
            parts.append((start, predict_window(chunk, fs, model_path)))
        elif parts:  # fold a short tail into nothing: it is too short to score
            pass
    beats, alerts, warnings, scores = [], [], [], []
    for start, r in parts:
        for b in r["beats"]:
            beats.append({**b, "sample": b["sample"] + start,
                          "time_s": round((b["sample"] + start) / fs, 3)})
        for a in r["alerts"]:
            alerts.append({**a, "start_sample": a["start_sample"] + start,
                           "end_sample": a["end_sample"] + start})
        warnings += [f"t={start / fs:.0f}s: {w}" for w in r["warnings"]]
        scores.append(r["quality"]["score"])
    from qalb_ml.alerts import rhythm_summary
    peaks = np.array([b["sample"] * FS / fs for b in beats])
    summary = rhythm_summary(peaks, [b["class"] for b in beats], FS)
    quality = dict(parts[0][1]["quality"]) if parts else {}
    quality["score"] = round(float(np.mean(scores)), 3) if scores else 0.0
    quality["min_window_score"] = round(float(np.min(scores)), 3) if scores else 0.0
    first = parts[0][1]
    return make_result(model_name=first["model"]["name"], model_version=first["model"]["version"],
                       fs_in=fs, duration_s=len(signal) / fs, beats=beats, rhythm=summary,
                       alerts=sorted(alerts, key=lambda a: a["start_sample"]),
                       quality=quality, warnings=warnings)


def _stream_record(name: str, seconds: float, window_s: float, delay: float) -> None:
    from qalb_ml.data import load_record
    signal, fs, _, _ = load_record(name)
    signal = signal[:int(seconds * fs)]
    size = int(window_s * fs)
    print(f"Streaming MIT-BIH record {name}: {len(signal) / fs:.0f} s in {window_s:g} s windows")
    for start in range(0, len(signal) - size + 1, size):
        res = predict_window(signal[start:start + size], fs)
        counts = res["rhythm"]["class_counts"]
        t0 = start / fs
        print(f"[{t0:6.1f}s] beats={res['rhythm']['n_beats']:3d} "
              f"hr={res['rhythm']['mean_hr_bpm']} rhythm={res['rhythm']['rhythm']} "
              f"quality={res['quality']['score']:.2f} "
              + " ".join(f"{k}:{v}" for k, v in counts.items() if v))
        for b in res["beats"][:5]:
            print(f"    beat @ {t0 + b['time_s']:7.2f}s  {b['class']}  conf {b['confidence']:.2f}")
        for a in res["alerts"]:
            print(f"    ALERT [{a['severity']}] {a['message']} (conf {a['confidence']:.2f})")
        if delay:
            time.sleep(delay)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Stream a MIT-BIH record through the classifier")
    ap.add_argument("--record", default="100", help="MIT-BIH record name (default 100)")
    ap.add_argument("--seconds", type=float, default=60.0, help="how much of the record to use")
    ap.add_argument("--window", type=float, default=10.0, help="window length in seconds")
    ap.add_argument("--delay", type=float, default=0.0, help="pause between windows (s)")
    ap.add_argument("--file", help="analyse a CSV/TXT file instead and print the JSON result")
    ap.add_argument("--fs", type=float, default=FS, help="sampling rate for --file")
    args = ap.parse_args(argv)
    if args.file:
        import json
        from inputs import load_ecg
        ecg = load_ecg(args.file, fs=args.fs)
        print(json.dumps(analyse_recording(ecg.signal, ecg.fs), indent=2))
        return 0
    _stream_record(args.record, args.seconds, args.window, args.delay)
    return 0


if __name__ == "__main__":
    sys.exit(main())
