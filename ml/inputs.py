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


def _to_float_rows(text: str) -> list[list[float]]:
    """Parse numeric rows, skipping a header and blank/comment lines."""
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(("#", "%", "//")):
            continue
        parts = [p for p in re.split(r"[,;\t ]+", line) if p != ""]
        try:
            rows.append([float(p) for p in parts])
        except ValueError:
            if rows:  # text after data started: not a valid file
                raise InputError("The file contains non-numeric values after the data starts.")
            continue  # header line
    return rows


def parse_text(text: str, fs: float = FS) -> tuple[np.ndarray, float, dict]:
    """Parse CSV/TXT content. Returns (signal, sampling rate, info)."""
    rows = _to_float_rows(text)
    if not rows:
        raise InputError("No numeric ECG samples were found in the file.")
    width = {len(r) for r in rows}
    if len(width) != 1:
        raise InputError("Rows have different numbers of columns; expected one column of "
                         "samples or time and value columns.")
    arr = np.asarray(rows, dtype=float)
    if arr.shape[1] == 1:
        return arr[:, 0], float(fs), {"layout": "samples"}
    t, v = arr[:, 0], arr[:, 1]
    dt = np.diff(t)
    if len(dt) == 0 or np.median(dt) <= 0 or not np.all(np.isfinite(dt)):
        raise InputError("The time column is not increasing, so the sampling rate cannot be read.")
    median_dt = float(np.median(dt))
    # a step of 0.2 or more can only be milliseconds; smaller steps are seconds
    inferred = 1000.0 / median_dt if median_dt >= 0.2 else 1.0 / median_dt
    return v, float(inferred), {"layout": "time+value", "columns_used": [0, 1],
                                "inferred_fs": round(float(inferred), 2)}


def load_wfdb(stem: str | Path) -> tuple[np.ndarray, float, dict]:
    """Read a WFDB record given its path without extension."""
    import wfdb
    try:
        rec = wfdb.rdrecord(str(stem))
    except Exception as exc:  # wfdb raises many different types
        raise InputError(f"Could not read the WFDB record: {exc}") from exc
    if rec.p_signal is None or rec.p_signal.size == 0:
        raise InputError("The WFDB record contains no signal.")
    names = list(rec.sig_name)
    ch = names.index("MLII") if "MLII" in names else 0
    return rec.p_signal[:, ch].astype(float), float(rec.fs), {"layout": "wfdb", "channel": names[ch]}
