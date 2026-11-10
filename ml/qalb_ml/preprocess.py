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


def detect_r_peaks(clean: np.ndarray, fs: float = FS) -> np.ndarray:
    """Detect R peaks in a cleaned ECG using an energy-envelope detector.

    Band-pass 5-15 Hz, differentiate, square and integrate over ~150 ms, pick
    envelope peaks at least 200 ms apart, then snap each to the largest
    deflection in the cleaned signal. Works for either QRS polarity.
    """
    clean = np.asarray(clean, dtype=np.float64)
    if len(clean) < int(fs):
        return np.array([], dtype=int)
    nyq = fs / 2.0
    sos = butter(2, [5 / nyq, min(15, nyq * 0.95) / nyq], btype="band", output="sos")
    qrs = sosfiltfilt(sos, clean)
    energy = np.diff(qrs, prepend=qrs[0]) ** 2
    win = max(1, int(0.15 * fs))
    env = np.convolve(energy, np.ones(win) / win, mode="same")
    if env.max() <= 0:
        return np.array([], dtype=int)
    thr = 0.25 * np.percentile(env, 99)
    cand, _ = find_peaks(env, height=thr, distance=int(0.2 * fs))
    half = int(0.06 * fs)
    peaks = []
    for c in cand:
        lo, hi = max(0, c - half), min(len(clean), c + half + 1)
        peaks.append(lo + int(np.argmax(np.abs(clean[lo:hi]))))
    peaks = np.unique(peaks)
    if len(peaks) > 1:  # drop duplicates created by snapping
        keep = np.insert(np.diff(peaks) > int(0.2 * fs), 0, True)
        peaks = peaks[keep]
    return peaks.astype(int)


def segment_beats(clean: np.ndarray, peaks: np.ndarray, pre: int = PRE, post: int = POST):
    """Cut fixed windows around each peak.

    Returns (beats, valid_peaks); peaks too close to either edge are skipped.
    Beats are normalised per beat.
    """
    clean = np.asarray(clean, dtype=np.float64)
    beats, valid = [], []
    for p in np.asarray(peaks, dtype=int):
        if p - pre < 0 or p + post > len(clean):
            continue
        beats.append(normalise_beat(clean[p - pre:p + post]))
        valid.append(p)
    if not beats:
        return np.empty((0, pre + post)), np.array([], dtype=int)
    return np.vstack(beats), np.asarray(valid, dtype=int)


def preprocess_window(signal: np.ndarray, fs: float = FS, peaks: np.ndarray | None = None):
    """Full preprocessing of a raw ECG window.

    Resamples to 360 Hz, cleans, finds R peaks (unless ``peaks`` are given in
    the *input* sampling grid), and segments beats.

    Returns a dict with ``clean`` (360 Hz), ``peaks`` and ``beats`` (all
    peaks, in 360 Hz samples), ``beats`` (N x BEAT_LEN) and ``kept``: the peaks
    that were segmented.
    """
    sig = resample(signal, fs, FS)
    clean = clean_signal(sig, FS)
    if peaks is None:
        pk = detect_r_peaks(clean, FS)
    else:
        pk = np.round(np.asarray(peaks) * FS / fs).astype(int)
    beats, kept = segment_beats(clean, pk)
    return {"clean": clean, "peaks": pk, "beats": beats, "kept": kept}
