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


def validate_signal(signal: np.ndarray, fs: float, check_quality: bool = True) -> dict:
    """Reject unusable recordings. ``signal`` is at ``fs`` Hz. Returns the quality dict."""
    signal = np.asarray(signal, dtype=float)
    if not (MIN_SAMPLING_RATE <= fs <= MAX_SAMPLING_RATE):
        raise InputError(f"Sampling rate {fs:g} Hz is outside the supported range "
                         f"{MIN_SAMPLING_RATE:g}-{MAX_SAMPLING_RATE:g} Hz.")
    finite = np.isfinite(signal)
    if finite.mean() < 0.9:
        raise InputError("More than 10% of the samples are missing or not numbers.")
    if len(signal) / fs < MIN_SECONDS:
        raise InputError(f"The recording is too short ({len(signal) / fs:.1f} s); "
                         f"at least {MIN_SECONDS:g} s is needed.")
    if len(signal) / fs > MAX_SECONDS:
        raise InputError(f"The recording is too long ({len(signal) / fs / 60:.0f} min); "
                         f"the limit is {MAX_SECONDS / 60:.0f} min.")
    signal = signal[finite] if not finite.all() else signal
    if np.ptp(signal) < 1e-9 or flatline_fraction(signal) > 0.8:
        raise InputError("The signal is a flat line; no ECG activity was found.")
    quality = signal_quality(signal, fs)
    if check_quality and quality["score"] < MIN_QUALITY:
        raise InputError(f"The signal is too noisy to analyse (quality {quality['score']:.2f}, "
                         f"minimum {MIN_QUALITY:.2f}).")
    return quality


def load_ecg(source, fs: float = FS, filename: str | None = None,
             check_quality: bool = True) -> LoadedECG:
    """Load an ECG from a path, bytes or text and return it at 360 Hz.

    ``source`` may be a file path, a WFDB record stem, raw bytes or a string of
    text. ``fs`` is the sampling rate of one-column files (default 360 Hz).
    """
    if fs is None or not np.isfinite(fs) or fs <= 0:
        raise InputError("The sampling rate must be a positive number.")
    name = filename or (str(source) if isinstance(source, (str, Path)) and "\n" not in str(source) else "")
    suffix = Path(name).suffix.lower()
    if suffix and suffix not in SUPPORTED:
        raise InputError(f"Unsupported file type '{suffix}'. Use .csv, .tsv, .txt or a WFDB record.")

    if suffix in (".hea", ".dat") or (isinstance(source, (str, Path)) and not suffix
                                      and Path(str(source) + ".hea").exists()):
        stem = Path(name).with_suffix("") if suffix else Path(str(source))
        signal, file_fs, info = load_wfdb(stem)
    else:
        if isinstance(source, (bytes, bytearray)):
            try:
                text = bytes(source).decode("utf-8-sig")
            except UnicodeDecodeError:
                raise InputError("The file is not readable text; unsupported format.")
        elif isinstance(source, Path) or (isinstance(source, str) and "\n" not in source
                                          and Path(source).exists()):
            try:
                text = Path(source).read_text(encoding="utf-8-sig")
            except (UnicodeDecodeError, OSError):
                raise InputError("The file is not readable text; unsupported format.")
        elif isinstance(source, str):
            text = source
        else:
            raise InputError("Unsupported input type.")
        signal, file_fs, info = parse_text(text, fs)

    quality = validate_signal(signal, file_fs, check_quality)
    signal = signal[np.isfinite(signal)]
    out = resample(signal, file_fs, FS)
    info.update({"duration_s": round(len(signal) / file_fs, 2), "quality": quality})
    return LoadedECG(signal=out, fs=FS, original_fs=file_fs, source=name, info=info)


def load_ecg_bytes(data: bytes, filename: str, fs: float = FS, **kw) -> LoadedECG:
    return load_ecg(data, fs=fs, filename=filename, **kw)
