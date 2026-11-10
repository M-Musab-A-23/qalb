"""Turn a cleaned window into class probabilities with the packaged model.

A bundle always holds a boosting model. It may also point at a CNN file; the
CNN is loaded lazily, and if torch (or the file) is missing the boosting model
is used on its own with its own decision scales and a log line says so.
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from .cnn import torch_available
from .config import CLASSES, FS
from .cv import full_proba
from .ensemble import blend_probabilities
from .thresholds import apply_class_scales

log = logging.getLogger("qalb.inference")

_CNN_CACHE: dict = {}


def feature_builder(feature_set: str):
    """Window feature function for ``"v1"`` or ``"v2"``."""
    if feature_set == "v2":
        from .features_v2 import window_features_v2
        return window_features_v2
    from .features import window_features
    return window_features


def load_cnn_lazily(path: Path):
    """Return the CNN bundle, or None (with a log line) when it cannot be used."""
    path = Path(path)
    if not torch_available():
        log.warning("torch is not installed: using the gradient boosting model alone")
        return None
    if not path.exists():
        log.warning("CNN file %s not found: using the gradient boosting model alone", path)
        return None
    key = str(path.resolve())
    if key not in _CNN_CACHE:
        from .cnn import load_cnn
        _CNN_CACHE[key] = load_cnn(path)
    return _CNN_CACHE[key]


def active_model_name(bundle: dict, model_dir: Path) -> str:
    """Name reported in results: the ensemble only when its CNN part is usable."""
    ens = bundle.get("ensemble")
    if ens and load_cnn_lazily(Path(model_dir) / ens["cnn_file"]) is not None:
        return bundle["name"]
    return bundle.get("fallback_name", bundle["name"])


def classify_window(clean: np.ndarray, peaks: np.ndarray, bundle: dict, model_dir: Path):
    """Return (kept peaks, class probabilities (n, 5), predicted class indices)."""
    from .preprocess import segment_beats
    from .features import rr_features
    from .features_v2 import rr_context

    peaks = np.asarray(peaks, dtype=int)
    X, kept = feature_builder(bundle.get("feature_set", "v1"))(clean, peaks, FS)
    if len(kept) == 0:
        return kept, np.zeros((0, len(CLASSES))), np.array([], dtype=int)
    p_boost = full_proba(bundle["model"], X)
    ens = bundle.get("ensemble")
    cnn = load_cnn_lazily(Path(model_dir) / ens["cnn_file"]) if ens else None
    if cnn is None:
        scales = bundle.get("scales_boosting_only", np.ones(len(CLASSES)))
        return kept, p_boost, apply_class_scales(p_boost, scales)
    from .cnn import predict_proba_cnn

    beats, _ = segment_beats(clean, peaks)
    idx = np.searchsorted(peaks, kept)
    rr = np.hstack([rr_features(peaks, FS)[idx], rr_context(peaks, FS)[idx]])
    p_cnn = predict_proba_cnn(cnn, beats, rr)
    proba = blend_probabilities([p_boost, p_cnn], [ens["w_boost"], 1 - ens["w_boost"]])
    return kept, proba, apply_class_scales(proba, bundle["scales"])
