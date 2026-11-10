"""Load and validate user-supplied ECG recordings.

Supported formats:
  * CSV / TSV / plain text with one column of samples
  * CSV / TSV / plain text with time and value columns (time in seconds or
    milliseconds; the sampling rate is then inferred from the time column)
  * WFDB records (header + data files; the first channel, or MLII when
    present, is used)

Everything is returned resampled to 360 Hz. Unusable input raises
``InputError`` with a message that is safe to show to an end user.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from qalb_ml.config import FS
from qalb_ml.preprocess import resample
from qalb_ml.quality import flatline_fraction, signal_quality

MIN_SECONDS = 5.0
MAX_SECONDS = 3600.0
MIN_QUALITY = 0.35
MIN_SAMPLING_RATE, MAX_SAMPLING_RATE = 50.0, 5000.0
SUPPORTED = (".csv", ".tsv", ".txt", ".dat", ".hea")


class InputError(ValueError):
    """The uploaded ECG cannot be analysed; the message says why."""


@dataclass
class LoadedECG:
    signal: np.ndarray            # resampled to 360 Hz
    fs: float = FS
    original_fs: float = FS
    source: str = ""
    info: dict = field(default_factory=dict)
