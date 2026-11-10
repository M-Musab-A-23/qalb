"""Signal filters for single-lead ECG."""
from __future__ import annotations

import numpy as np
from scipy.signal import butter, medfilt, sosfiltfilt

from .config import BAND


def bandpass(signal: np.ndarray, fs: float, low: float = BAND[0], high: float = BAND[1],
             order: int = 4) -> np.ndarray:
    """Zero-phase Butterworth band-pass filter."""
    nyq = fs / 2.0
    high = min(high, nyq * 0.95)
    sos = butter(order, [low / nyq, high / nyq], btype="band", output="sos")
    return sosfiltfilt(sos, signal)
