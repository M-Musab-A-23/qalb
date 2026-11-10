"""Ways of handling class imbalance. All of them use training rows only."""
from __future__ import annotations

import numpy as np


def power_class_weights(y: np.ndarray, power: float = 1.0) -> np.ndarray:
    """Per-sample weights ``(n / (k * count_c)) ** power``.

    ``power=1`` is the usual balanced weighting, ``0.5`` a softer square-root
    version, ``0`` no weighting. The mean weight is 1.
    """
    y = np.asarray(y)
    classes, counts = np.unique(y, return_counts=True)
    per_class = (len(y) / (len(classes) * counts)) ** power
    w = per_class[np.searchsorted(classes, y)]
    return w / w.mean()


def oversample_indices(y: np.ndarray, frac: float = 0.25, seed: int = 42) -> np.ndarray:
    """Row indices that repeat rare classes until each has ``frac`` of the largest class.

    Apply it to the training part of a fold, never before splitting. Classes
    already above the target keep all their rows once. The result is shuffled.
    """
    y = np.asarray(y)
    rng = np.random.default_rng(seed)
    classes, counts = np.unique(y, return_counts=True)
    target = int(frac * counts.max())
    parts = []
    for c, n in zip(classes, counts):
        rows = np.flatnonzero(y == c)
        parts.append(rows)
        if n < target:
            parts.append(rng.choice(rows, target - n, replace=True))
    idx = np.concatenate(parts)
    rng.shuffle(idx)
    return idx


def focal_weights(y: np.ndarray, p_true: np.ndarray, gamma: float = 1.0,
                  power: float = 1.0, floor: float = 0.05) -> np.ndarray:
    """Focal-style sample weights: class weights times ``(1 - p_true) ** gamma``.

    ``p_true`` is the probability an earlier model gave the true class. Easy
    rows (``p_true`` near 1) are down-weighted so training concentrates on the
    hard ones. ``floor`` keeps every row slightly alive.
    """
    p = np.clip(np.asarray(p_true, dtype=float), 0.0, 1.0)
    w = power_class_weights(y, power) * np.maximum((1.0 - p) ** gamma, floor)
    return w / w.mean()
