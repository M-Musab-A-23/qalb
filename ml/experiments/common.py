"""Shared pieces for the improvement experiments (DS1 cross-validation only)."""
from __future__ import annotations

import json
import time
from pathlib import Path

import numpy as np

from qalb_ml.config import CACHE_DIR, REPORT_DIR
from qalb_ml.cv import grouped_folds
from qalb_ml.dataset import load_beats
from qalb_ml.features import build_features
from qalb_ml.features_v2 import build_features_v2

EXP_DIR = REPORT_DIR / "experiments"


def feature_matrices(split: str) -> dict:
    """Beat arrays plus the v1 and v2 feature matrices for ``"ds1"`` or ``"ds2"``."""
    cache = CACHE_DIR / f"{split}_features.npz"
    d = load_beats(split)
    if cache.exists():
        f = np.load(cache)
        d["X1"], d["X2"] = f["X1"], f["X2"]
        return d
    beats = d["beats"].astype(np.float64)
    d["X1"] = build_features(beats, d["kept"], rr=d["rr"])
    d["X2"] = build_features_v2(beats, d["kept"], rr=d["rr"], ctx=d["ctx"])
    np.savez_compressed(cache, X1=d["X1"], X2=d["X2"])
    return d


def ds1_folds(d: dict):
    return grouped_folds(d["groups"])


def save_result(name: str, payload: dict) -> Path:
    EXP_DIR.mkdir(parents=True, exist_ok=True)
    path = EXP_DIR / f"{name}.json"
    path.write_text(json.dumps(payload, indent=2))
    return path


def load_result(name: str) -> dict:
    return json.loads((EXP_DIR / f"{name}.json").read_text())


class Timer:
    def __enter__(self):
        self.t0 = time.time()
        return self

    def __exit__(self, *exc):
        self.seconds = time.time() - self.t0


def log(msg: str) -> None:
    print(msg, flush=True)
