"""Preprocessing: resampling, cleaning, R-peak detection and beat segmentation.

Every function works on a plain 1-D numpy array, so the edge layer and the
upload feature can call them on any raw ECG window.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, find_peaks, resample_poly, sosfiltfilt
from math import gcd

from .config import BEAT_LEN, FS, POST, PRE
from .filters import bandpass, remove_baseline


def resample(signal: np.ndarray, fs_in: float, fs_out: float = FS) -> np.ndarray:
    """Resample to ``fs_out`` Hz with a polyphase filter."""
    signal = np.asarray(signal, dtype=np.float64)
    if abs(fs_in - fs_out) < 1e-9:
        return signal
    up, down = int(round(fs_out * 100)), int(round(fs_in * 100))
    g = gcd(up, down)
    return resample_poly(signal, up // g, down // g)


def clean_signal(signal: np.ndarray, fs: float = FS) -> np.ndarray:
    """Baseline removal followed by a 0.5-40 Hz band-pass."""
    signal = np.asarray(signal, dtype=np.float64)
    signal = np.nan_to_num(signal, nan=float(np.nanmedian(signal)) if np.isfinite(signal).any() else 0.0)
    return bandpass(remove_baseline(signal, fs), fs)


def normalise_beat(beat: np.ndarray) -> np.ndarray:
    """Zero-mean, unit-variance scaling of a single beat."""
    beat = np.asarray(beat, dtype=np.float64)
    std = beat.std()
    if std < 1e-9:
        return beat - beat.mean()
    return (beat - beat.mean()) / std
