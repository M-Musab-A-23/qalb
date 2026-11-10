"""Signal-quality score for a raw ECG window."""
from __future__ import annotations

import numpy as np
from scipy.signal import welch

from .config import FS
from .preprocess import clean_signal, detect_r_peaks, segment_beats


def flatline_fraction(signal: np.ndarray, tol: float = 1e-6) -> float:
    """Fraction of consecutive samples that do not change."""
    signal = np.asarray(signal, dtype=float)
    if len(signal) < 2:
        return 1.0
    return float(np.mean(np.abs(np.diff(signal)) <= tol))


def noise_ratio(signal: np.ndarray, fs: float = FS) -> float:
    """Share of spectral power above 40 Hz (mains hum, muscle noise)."""
    signal = np.asarray(signal, dtype=float)
    f, p = welch(signal - signal.mean(), fs=fs, nperseg=min(len(signal), 1024))
    total = p[f >= 0.5].sum()
    return float(p[f > 40].sum() / total) if total > 0 else 1.0


def beat_agreement(clean: np.ndarray, peaks: np.ndarray) -> float:
    """Median correlation of each beat with the median beat (0 to 1)."""
    beats, _ = segment_beats(clean, peaks)
    if len(beats) < 3:
        return 0.0
    template = np.median(beats, axis=0)
    if template.std() < 1e-9:
        return 0.0
    corr = [np.corrcoef(b, template)[0, 1] for b in beats if b.std() > 1e-9]
    return float(np.clip(np.median(corr), 0.0, 1.0)) if corr else 0.0


def rate_plausibility(peaks: np.ndarray, n_samples: int, fs: float = FS) -> float:
    """1 if the detected rate is physiological (30-220 bpm), falling off outside."""
    if len(peaks) < 2:
        return 0.0
    bpm = 60.0 * fs * (len(peaks) - 1) / max(peaks[-1] - peaks[0], 1)
    if 30 <= bpm <= 220:
        return 1.0
    return float(max(0.0, 1.0 - min(abs(bpm - 30), abs(bpm - 220)) / 60.0))


def signal_quality(signal: np.ndarray, fs: float = FS) -> dict:
    """Return the overall score in [0, 1] plus its components.

    Score = 0.45 * beat agreement + 0.3 * (1 - noise share scaled) +
    0.25 * rate plausibility, scaled down when beats disagree and by the
    non-flat fraction.
    """
    signal = np.asarray(signal, dtype=float)
    flat = flatline_fraction(signal)
    if len(signal) < int(2 * fs) or np.ptp(signal) < 1e-9:
        return {"score": 0.0, "flatline_fraction": round(flat, 3), "noise_ratio": 1.0,
                "beat_agreement": 0.0, "rate_plausibility": 0.0}
    clean = clean_signal(signal, fs)
    peaks = detect_r_peaks(clean, fs)
    noise = noise_ratio(signal, fs)
    agree = beat_agreement(clean, peaks)
    rate = rate_plausibility(peaks, len(clean), fs)
    score = (0.45 * agree + 0.30 * (1.0 - min(1.0, noise * 4.0)) + 0.25 * rate) * (0.3 + 0.7 * agree) * (1.0 - flat)
    return {"score": round(float(np.clip(score, 0, 1)), 3), "flatline_fraction": round(flat, 3),
            "noise_ratio": round(noise, 4), "beat_agreement": round(agree, 3),
            "rate_plausibility": round(rate, 3)}
