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
