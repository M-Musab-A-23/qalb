"""Rule layer on top of beat labels: rhythm summary and alerts.

The rules are intentionally simple and transparent. Each alert carries a
confidence in [0, 1] built from the beat confidences and how far the pattern
is past its threshold.
"""
from __future__ import annotations

import numpy as np

from .config import FS

MIN_BEATS_FOR_RHYTHM = 8
IRREGULAR_CV = 0.15        # RR coefficient of variation above this is irregular
IRREGULAR_JUMP = 0.20      # successive RR change counted as a jump above 20 %
TACHY_BPM, BRADY_BPM = 100.0, 50.0


def _alert(kind, severity, confidence, start, end, message):
    return {"type": kind, "severity": severity,
            "confidence": round(float(np.clip(confidence, 0.0, 1.0)), 3),
            "start_sample": int(start), "end_sample": int(end), "message": message}


def rhythm_summary(peaks, classes, fs: float = FS) -> dict:
    """Heart rate, RR variability and beat counts for a window."""
    peaks = np.asarray(peaks, dtype=float)
    counts = {c: int(np.sum(np.asarray(classes) == c)) for c in "NSVFQ"}
    summary = {"n_beats": int(len(peaks)), "class_counts": counts,
               "mean_hr_bpm": None, "rr_mean_s": None, "rr_cv": None,
               "rr_jump_fraction": None, "rhythm": "insufficient data"}
    if len(peaks) < 3:
        return summary
    rr = np.diff(peaks) / fs
    mean = float(rr.mean())
    cv = float(rr.std() / mean) if mean > 0 else 0.0
    jumps = np.abs(np.diff(rr)) / rr[:-1]
    jump_frac = float(np.mean(jumps > IRREGULAR_JUMP))
    summary.update({"mean_hr_bpm": round(60.0 / mean, 1), "rr_mean_s": round(mean, 3),
                    "rr_cv": round(cv, 3), "rr_jump_fraction": round(jump_frac, 3)})
    if len(peaks) >= MIN_BEATS_FOR_RHYTHM:
        summary["rhythm"] = "irregular" if _is_irregular(cv, jump_frac) else "regular"
    return summary


def _is_irregular(cv: float, jump_frac: float) -> bool:
    return cv > IRREGULAR_CV and jump_frac > 0.25
