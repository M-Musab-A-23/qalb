"""Richer beat features (feature set v2).

Every function works on plain arrays so it can be applied to a raw window:
``rr_context`` takes R-peak positions, the morphology functions take
normalised beats of ``BEAT_LEN`` samples with the R peak at index ``PRE``.
"""
from __future__ import annotations

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

from .config import FS

_EPS = 1e-9

RR_CTX_NAMES = [
    "rr_prev2", "rr_prev1", "rr_next1", "rr_next2",
    "ratio_prev1_next1", "ratio_prev2_prev1", "ratio_next2_next1",
    "ratio_prev1_mean9", "ratio_next1_mean9",
    "diff_prev", "diff_next",
    "rmssd5", "sdnn5", "cv9", "pnn50_9",
    "ratio_prev1_median9", "compensatory", "local_hr", "hr_change",
]


def rr_context(peaks: np.ndarray, fs: float = FS) -> np.ndarray:
    """RR context for every peak: two intervals before and after, ratios and local HRV.

    Columns follow ``RR_CTX_NAMES``. Intervals are in seconds. Beats near the
    ends of the sequence reuse their nearest available interval, so the
    output is finite for any number of peaks.
    """
    peaks = np.asarray(peaks, dtype=float)
    n = len(peaks)
    if n == 0:
        return np.empty((0, len(RR_CTX_NAMES)))
    rr = np.diff(peaks) / fs if n > 1 else np.array([1.0])
    padded = np.pad(rr, 4, mode="edge")
    win9 = sliding_window_view(padded, 9)[:n]          # rr[i-4 .. i+4]
    win5 = win9[:, 2:7]                                 # rr[i-2 .. i+2]
    prev2, prev1, next1, next2 = (padded[2:2 + n], padded[3:3 + n],
                                  padded[4:4 + n], padded[5:5 + n])
    mean9 = win9.mean(axis=1)
    median9 = np.median(win9, axis=1)
    diffs5 = np.diff(win5, axis=1)
    diffs9 = np.abs(np.diff(win9, axis=1))
    sdnn5 = win5.std(axis=1)
    cols = [
        prev2, prev1, next1, next2,
        prev1 / (next1 + _EPS), prev2 / (prev1 + _EPS), next2 / (next1 + _EPS),
        prev1 / (mean9 + _EPS), next1 / (mean9 + _EPS),
        prev1 - prev2, next2 - next1,
        np.sqrt((diffs5 ** 2).mean(axis=1)), sdnn5, win9.std(axis=1) / (mean9 + _EPS),
        (diffs9 > 0.05).mean(axis=1),
        prev1 / (median9 + _EPS), (prev1 + next1) / (2 * median9 + _EPS),
        60.0 / (mean9 + _EPS), 60.0 / (prev1 + _EPS) - 60.0 / (next1 + _EPS),
    ]
    return np.column_stack(cols)
