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


def ventricular_alerts(peaks, classes, confidences, fs: float = FS) -> list[dict]:
    """Flag couplets, runs and frequent ventricular beats."""
    classes = np.asarray(classes)
    conf = np.asarray(confidences, dtype=float)
    peaks = np.asarray(peaks, dtype=int)
    out, i, n = [], 0, len(classes)
    while i < n:
        if classes[i] != "V":
            i += 1
            continue
        j = i
        while j + 1 < n and classes[j + 1] == "V":
            j += 1
        length = j - i + 1
        c = float(conf[i:j + 1].mean())
        if length >= 3:
            rate = 60.0 * fs * (length - 1) / max(peaks[j] - peaks[i], 1)
            msg = f"Ventricular pattern: run of {length} ventricular beats (~{rate:.0f} bpm)"
            out.append(_alert("ventricular_run", "high", c * min(1.0, 0.7 + 0.1 * length),
                              peaks[i], peaks[j], msg))
        elif length == 2:
            out.append(_alert("ventricular_couplet", "medium", c * 0.8, peaks[i], peaks[j],
                              "Ventricular pattern: two consecutive ventricular beats"))
        i = j + 1
    v_idx = np.flatnonzero(classes == "V")
    isolated_total = len(v_idx)
    if n >= MIN_BEATS_FOR_RHYTHM and isolated_total >= 3 and isolated_total / n >= 0.10 \
            and not any(a["type"] == "ventricular_run" for a in out):
        frac = isolated_total / n
        out.append(_alert("frequent_ventricular_beats", "medium",
                          float(conf[v_idx].mean()) * min(1.0, 0.5 + frac),
                          peaks[v_idx[0]], peaks[v_idx[-1]],
                          f"Ventricular pattern: {isolated_total} ventricular beats "
                          f"({100 * frac:.0f}% of the window)"))
    return out


def rhythm_alerts(peaks, summary: dict) -> list[dict]:
    """Irregular rhythm and abnormal rate alerts from the RR statistics."""
    out = []
    if summary["rhythm"] == "irregular" and len(peaks):
        strength = (summary["rr_cv"] - IRREGULAR_CV) / 0.25 + summary["rr_jump_fraction"] * 0.5
        conf = 0.5 + 0.5 * np.clip(strength, 0, 1)
        out.append(_alert("irregular_rhythm", "medium", conf, peaks[0], peaks[-1],
                          f"Irregular rhythm: RR variation {100 * summary['rr_cv']:.0f}% "
                          f"with {100 * summary['rr_jump_fraction']:.0f}% large interval changes"))
    hr = summary["mean_hr_bpm"]
    if hr is not None and summary["n_beats"] >= MIN_BEATS_FOR_RHYTHM:
        if hr > TACHY_BPM:
            out.append(_alert("fast_rate", "low", min(1.0, 0.5 + (hr - TACHY_BPM) / 100),
                              peaks[0], peaks[-1], f"Fast heart rate: {hr:.0f} bpm"))
        elif hr < BRADY_BPM:
            out.append(_alert("slow_rate", "low", min(1.0, 0.5 + (BRADY_BPM - hr) / 40),
                              peaks[0], peaks[-1], f"Slow heart rate: {hr:.0f} bpm"))
    return out


def analyse_rhythm(peaks, classes, confidences, fs: float = FS):
    """Return (rhythm_summary, alerts) for a sequence of classified beats."""
    summary = rhythm_summary(peaks, classes, fs)
    alerts = ventricular_alerts(peaks, classes, confidences, fs) + rhythm_alerts(peaks, summary)
    alerts.sort(key=lambda a: a["start_sample"])
    return summary, alerts
