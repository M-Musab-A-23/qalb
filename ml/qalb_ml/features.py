"""Hand-built features per beat: rhythm (RR), heart rate and morphology."""
from __future__ import annotations

import numpy as np
import pywt
from scipy.stats import kurtosis, skew

from .config import FS, PRE

RR_NAMES = ["rr_prev", "rr_next", "rr_avg", "rr_prev_ratio", "rr_next_ratio",
            "rr_pair_ratio", "heart_rate"]


def rr_features(peaks: np.ndarray, fs: float = FS, window: int = 10) -> np.ndarray:
    """RR features for every peak in a sequence (seconds, ratios, bpm).

    Columns follow ``RR_NAMES``. The first/last beat reuse their only
    neighbouring interval.
    """
    peaks = np.asarray(peaks, dtype=float)
    n = len(peaks)
    if n == 0:
        return np.empty((0, len(RR_NAMES)))
    if n == 1:
        rr = np.array([1.0])
        prev = nxt = rr
    else:
        rr = np.diff(peaks) / fs
        prev = np.concatenate([[rr[0]], rr])
        nxt = np.concatenate([rr, [rr[-1]]])
    avg = np.empty(n)
    for i in range(n):
        lo = max(0, i - window + 1)
        avg[i] = prev[lo:i + 1].mean()
    prev_ratio = prev / avg
    next_ratio = nxt / avg
    pair = prev / nxt
    hr = 60.0 / avg
    return np.column_stack([prev, nxt, avg, prev_ratio, next_ratio, pair, hr])


def morphology_raw(beats: np.ndarray, step: int = 3) -> np.ndarray:
    """Down-sampled beat samples (every ``step``-th sample)."""
    return np.asarray(beats)[:, ::step]


def morphology_wavelet(beats: np.ndarray, wavelet: str = "db4", level: int = 4) -> np.ndarray:
    """Approximation + coarse detail coefficients from a wavelet decomposition."""
    out = []
    for b in np.asarray(beats):
        coeffs = pywt.wavedec(b, wavelet, level=level)
        out.append(np.concatenate(coeffs[:3]))  # cA4, cD4, cD3
    return np.asarray(out)


STAT_NAMES = ["std_pre", "std_qrs", "std_post", "skew", "kurt", "max", "min",
              "argmax_off", "argmin_off", "qrs_width", "qrs_energy_frac",
              "area_abs"]


def morphology_stats(beats: np.ndarray, fs: float = FS) -> np.ndarray:
    """Simple shape statistics: spread, extremes, QRS width and energy share."""
    beats = np.asarray(beats)
    rows = []
    q0, q1 = PRE - int(0.06 * fs), PRE + int(0.08 * fs)
    for b in beats:
        qrs = b[q0:q1]
        peak = np.max(np.abs(b))
        above = np.abs(b[q0 - 10:q1 + 10]) > 0.3 * peak
        width = above.sum() / fs if peak > 0 else 0.0
        total = float(np.sum(b ** 2)) + 1e-12
        rows.append([
            b[:q0].std(), qrs.std(), b[q1:].std(),
            skew(b), kurtosis(b), b.max(), b.min(),
            (np.argmax(b) - PRE) / fs, (np.argmin(b) - PRE) / fs,
            width, float(np.sum(qrs ** 2)) / total, float(np.sum(np.abs(b))) / len(b),
        ])
    return np.asarray(rows)


def build_features(beats: np.ndarray, peaks: np.ndarray, fs: float = FS) -> np.ndarray:
    """Full feature matrix: RR + heart rate + stats + wavelet + raw morphology.

    ``peaks`` must be the consecutive peak positions that ``beats`` was cut
    from, so RR intervals are computed against the true neighbours.
    """
    beats = np.asarray(beats)
    if len(beats) == 0:
        return np.empty((0, feature_dim()))
    return np.hstack([
        rr_features(peaks, fs),
        morphology_stats(beats, fs),
        morphology_wavelet(beats),
        morphology_raw(beats),
    ])


def feature_dim() -> int:
    from .config import BEAT_LEN
    dummy = np.zeros((1, BEAT_LEN))
    return (len(RR_NAMES) + len(STAT_NAMES)
            + morphology_wavelet(dummy).shape[1] + morphology_raw(dummy).shape[1])
