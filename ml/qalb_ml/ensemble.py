"""Averaging probabilities from several models."""
from __future__ import annotations

import numpy as np


def blend_probabilities(probas: list[np.ndarray], weights) -> np.ndarray:
    """Weighted average of probability arrays; weights are normalised to sum to 1."""
    w = np.asarray(weights, dtype=float)
    if len(w) != len(probas):
        raise ValueError("one weight per model is required")
    if (w < 0).any() or w.sum() <= 0:
        raise ValueError("weights must be non-negative with a positive sum")
    w = w / w.sum()
    out = sum(wi * np.asarray(p, dtype=float) for wi, p in zip(w, probas))
    return out / out.sum(axis=1, keepdims=True)


def choose_blend_weight(y, p_a, p_b, folds, grid=None) -> tuple[float, dict]:
    """Weight on model A (model B gets 1 - w) with the best mean fold macro-F1.

    Only labels and out-of-fold probabilities from the training data go in.
    Returns the weight and the score for every candidate.
    """
    from .thresholds import macro_f1

    grid = np.round(np.linspace(0, 1, 11), 2) if grid is None else grid
    scores = {}
    for w in grid:
        pred = blend_probabilities([p_a, p_b], [w, 1 - w]).argmax(axis=1)
        scores[float(w)] = float(np.mean([macro_f1(y[va], pred[va]) for _, va in folds]))
    best = max(scores, key=lambda k: (scores[k], -abs(k - 0.5)))
    return best, scores
