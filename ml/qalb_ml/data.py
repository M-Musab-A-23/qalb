"""Load MIT-BIH records (lead MLII) with beat annotations."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import wfdb

from .config import LEAD, PACED_RECORDS, RAW_DIR
from .labels import symbol_to_aami


def list_records(raw_dir: Path = RAW_DIR) -> list[str]:
    """All usable record names (paced records removed), sorted."""
    names = sorted(p.stem for p in Path(raw_dir).glob("*.hea") if p.stem.isdigit())
    return [n for n in names if n not in PACED_RECORDS]


def load_record(name: str, raw_dir: Path = RAW_DIR):
    """Return (signal, fs, peak_samples, labels) for one record.

    Only the MLII lead is returned. Records without MLII are rejected.
    """
    path = str(Path(raw_dir) / name)
    rec = wfdb.rdrecord(path)
    if LEAD not in rec.sig_name:
        raise ValueError(f"record {name} has no {LEAD} lead")
    signal = rec.p_signal[:, rec.sig_name.index(LEAD)].astype(np.float64)
    ann = wfdb.rdann(path, "atr")
    peaks, labels = [], []
    for sample, sym in zip(ann.sample, ann.symbol):
        cls = symbol_to_aami(sym)
        if cls is not None:
            peaks.append(int(sample))
            labels.append(cls)
    return signal, int(rec.fs), np.asarray(peaks), np.asarray(labels)
