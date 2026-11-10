"""Build inter-patient train/test sets (DS1 / DS2) from MIT-BIH records."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from .config import CACHE_DIR, CLASSES, DS1, DS2, FS
from .data import load_record
from .features import window_features
from .preprocess import clean_signal


def record_dataset(name: str, raw_dir: Path | None = None):
    """Features, class indices and peak positions for one record."""
    kwargs = {} if raw_dir is None else {"raw_dir": raw_dir}
    sig, fs, peaks, labels = load_record(name, **kwargs)
    clean = clean_signal(sig, fs)
    X, kept = window_features(clean, peaks, fs)
    idx = np.searchsorted(peaks, kept)
    y = np.array([CLASSES.index(l) for l in labels[idx]], dtype=int)
    return X, y, kept


def build_split(records: list[str], cache_name: str | None = None):
    """Stack several records. Returns X, y, groups (record name per beat)."""
    if cache_name:
        f = CACHE_DIR / f"{cache_name}.npz"
        if f.exists():
            d = np.load(f, allow_pickle=True)
            return d["X"], d["y"], d["groups"]
    Xs, ys, gs = [], [], []
    for name in records:
        X, y, _ = record_dataset(name)
        Xs.append(X)
        ys.append(y)
        gs.append(np.full(len(y), name))
    X, y, g = np.vstack(Xs), np.concatenate(ys), np.concatenate(gs)
    if cache_name:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(CACHE_DIR / f"{cache_name}.npz", X=X, y=y, groups=g)
    return X, y, g


def load_ds1(cache: bool = True):
    return build_split(DS1, "ds1" if cache else None)


def load_ds2(cache: bool = True):
    return build_split(DS2, "ds2" if cache else None)


def record_beats(name: str, raw_dir: Path | None = None):
    """Normalised beats plus the RR context of one record.

    Returns a dict with ``beats``, ``kept`` (peak samples), ``y``, ``rr``
    (v1 RR features) and ``ctx`` (v2 RR context), all aligned per beat.
    """
    from .features import rr_features
    from .features_v2 import rr_context
    from .preprocess import segment_beats

    kwargs = {} if raw_dir is None else {"raw_dir": raw_dir}
    sig, fs, peaks, labels = load_record(name, **kwargs)
    clean = clean_signal(sig, fs)
    beats, kept = segment_beats(clean, peaks)
    idx = np.searchsorted(peaks, kept)
    y = np.array([CLASSES.index(l) for l in labels[idx]], dtype=int)
    return {"beats": beats.astype(np.float32), "kept": kept, "y": y,
            "rr": rr_features(peaks, fs)[idx], "ctx": rr_context(peaks, fs)[idx]}


def build_beat_split(records: list[str], cache_name: str | None = None) -> dict:
    """Stack ``record_beats`` over records and add ``groups`` (record per beat)."""
    if cache_name:
        f = CACHE_DIR / f"{cache_name}_beats.npz"
        if f.exists():
            d = np.load(f, allow_pickle=True)
            return {k: d[k] for k in d.files}
    parts = [record_beats(r) for r in records]
    out = {k: np.concatenate([p[k] for p in parts]) for k in parts[0]}
    out["groups"] = np.concatenate([np.full(len(p["y"]), r) for p, r in zip(parts, records)])
    if cache_name:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(CACHE_DIR / f"{cache_name}_beats.npz", **out)
    return out


def load_beats(split: str, cache: bool = True) -> dict:
    """Beat-level arrays for ``"ds1"`` or ``"ds2"`` (cached under ``.cache/``)."""
    records = {"ds1": DS1, "ds2": DS2}[split]
    return build_beat_split(records, split if cache else None)
