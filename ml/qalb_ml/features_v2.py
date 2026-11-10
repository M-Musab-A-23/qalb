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
    padded = np.pad(rr, (4, 5), mode="edge")
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


WAVELET_LEVEL = 5


def wavelet_features(beats: np.ndarray, wavelet: str = "db4",
                     level: int = WAVELET_LEVEL) -> np.ndarray:
    """Wavelet descriptors per beat.

    Level-5 approximation and detail coefficients, the relative energy and the
    peak magnitude of every band, and the wavelet entropy of the energy split.
    """
    import pywt

    rows = []
    for b in np.asarray(beats, dtype=float):
        bands = pywt.wavedec(b, wavelet, level=level)       # cA5, cD5 ... cD1
        energy = np.array([np.sum(c ** 2) for c in bands])
        rel = energy / (energy.sum() + _EPS)
        entropy = -np.sum(rel * np.log(rel + _EPS))
        peak = np.array([np.max(np.abs(c)) for c in bands])
        rows.append(np.concatenate([bands[0], bands[1], rel, peak, [entropy]]))
    return np.asarray(rows)


SHAPE_NAMES = [
    "r_amp", "q_amp", "s_amp", "p_amp", "t_max", "t_min",
    "q_over_r", "s_over_r", "t_over_r", "p_over_r", "pre_post_std_ratio",
    "qrs_width_half", "qrs_duration", "max_up_slope", "max_down_slope",
    "slope_ratio", "area_pos", "area_neg", "area_ratio", "n_extrema_qrs", "st_level",
]


def _first_false_run(mask: np.ndarray) -> np.ndarray:
    """Length of the leading run of True along axis 1."""
    return np.where(mask.all(axis=1), mask.shape[1], np.argmin(mask, axis=1))


def morphology_shape(beats: np.ndarray, fs: float = FS) -> np.ndarray:
    """Amplitude ratios and QRS width estimates from normalised beats.

    Columns follow ``SHAPE_NAMES``. Beats are expected to have their R peak at
    index ``PRE``; the windows used are fractions of a second so the result
    does not depend on the exact beat length.
    """
    from .config import PRE

    b = np.asarray(beats, dtype=float)
    if b.ndim != 2 or len(b) == 0:
        return np.empty((0, len(SHAPE_NAMES)))
    c = PRE
    s = lambda sec: int(round(sec * fs))
    r_amp = b[:, c]
    ref = np.abs(r_amp) + _EPS
    q_amp = b[:, c - s(0.083):c].min(axis=1)
    s_amp = b[:, c:c + s(0.083)].min(axis=1)
    p_amp = b[:, c - s(0.22):c - s(0.083)].max(axis=1)
    t_seg = b[:, c + s(0.10):c + s(0.30)]
    t_max, t_min = t_seg.max(axis=1), t_seg.min(axis=1)
    pre_std = b[:, :c - s(0.083)].std(axis=1)
    post_std = b[:, c + s(0.11):].std(axis=1)

    # width of the QRS at half of the peak height, walking out from the R peak
    half = s(0.11)
    seg = np.abs(b[:, c - half:c + half + 1])
    above = seg > 0.5 * np.abs(r_amp)[:, None]
    left = _first_false_run(above[:, :half][:, ::-1])
    right = _first_false_run(above[:, half + 1:])
    width_half = (left + right + 1) / fs

    # QRS duration from where the slope leaves and re-enters the baseline
    lo, hi = c - s(0.083), c + s(0.11)
    slope = np.diff(b[:, lo:hi], axis=1) * fs
    mag = np.abs(slope)
    active = mag > 0.2 * mag.max(axis=1, keepdims=True)
    first = np.argmax(active, axis=1)
    last = active.shape[1] - 1 - np.argmax(active[:, ::-1], axis=1)
    duration = (last - first + 1) / fs
    up, down = slope.max(axis=1), slope.min(axis=1)

    qrs = b[:, c - s(0.06):c + s(0.08)]
    pos = np.clip(qrs, 0, None).sum(axis=1)
    neg = -np.clip(qrs, None, 0).sum(axis=1)
    ds = np.diff(qrs, axis=1)
    extrema = (np.sign(ds[:, 1:]) != np.sign(ds[:, :-1])) & (np.abs(ds[:, 1:]) > 0.02)
    st = b[:, c + s(0.055):c + s(0.11)].mean(axis=1)
    return np.column_stack([
        r_amp, q_amp, s_amp, p_amp, t_max, t_min,
        q_amp / ref, s_amp / ref, t_max / ref, p_amp / ref,
        pre_std / (post_std + _EPS), width_half, duration,
        up, down, up / (np.abs(down) + _EPS), pos, neg, pos / (neg + _EPS),
        extrema.sum(axis=1), st,
    ])
