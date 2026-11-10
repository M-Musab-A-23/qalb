"""Per-class decision scales on predicted probabilities.

The predicted class is ``argmax(proba * scales)``. A scale above 1 makes the
model more willing to call that class (higher recall, lower precision).
Scales are fitted on out-of-fold probabilities from DS1 only.
"""
from __future__ import annotations

import numpy as np

from .config import CLASSES

SCORED_IDX = [CLASSES.index(c) for c in ["N", "S", "V", "F"]]
TUNABLE = [CLASSES.index(c) for c in ["S", "V", "F"]]     # N stays at 1, Q is not scored
DEFAULT_GRID = np.exp(np.linspace(np.log(0.25), np.log(40.0), 31))


def apply_class_scales(proba: np.ndarray, scales) -> np.ndarray:
    """Class indices after multiplying each probability column by its scale."""
    return (np.asarray(proba) * np.asarray(scales, dtype=float)).argmax(axis=1)


def class_scores(y: np.ndarray, pred: np.ndarray) -> dict:
    """Fast per-class precision, recall and F1 from counts (all classes)."""
    k = len(CLASSES)
    cm = np.bincount(np.asarray(y) * k + np.asarray(pred), minlength=k * k).reshape(k, k)
    tp = np.diag(cm).astype(float)
    pred_n, true_n = cm.sum(axis=0), cm.sum(axis=1)
    precision = np.divide(tp, pred_n, out=np.zeros(k), where=pred_n > 0)
    recall = np.divide(tp, true_n, out=np.zeros(k), where=true_n > 0)
    denom = precision + recall
    f1 = np.divide(2 * precision * recall, denom, out=np.zeros(k), where=denom > 0)
    return {"precision": precision, "recall": recall, "f1": f1}


def macro_f1(y: np.ndarray, pred: np.ndarray) -> float:
    """Mean F1 over N, S, V, F."""
    return float(class_scores(y, pred)["f1"][SCORED_IDX].mean())


def fit_class_scales(y: np.ndarray, proba: np.ndarray, grid=DEFAULT_GRID, rounds: int = 3,
                     min_precision: dict | None = None) -> np.ndarray:
    """Coordinate ascent on the scales of S, V and F to maximise macro-F1.

    ``min_precision`` maps a class name to the lowest precision a candidate
    scale may have (an optional guard against calling too many false alarms).
    Returns a length-5 array with scale 1 for N and Q.
    """
    y, proba = np.asarray(y), np.asarray(proba)
    floors = {CLASSES.index(c): v for c, v in (min_precision or {}).items()}
    scales = np.ones(len(CLASSES))
    best = macro_f1(y, apply_class_scales(proba, scales))
    for _ in range(rounds):
        changed = False
        for c in TUNABLE:
            for s in grid:
                trial = scales.copy()
                trial[c] = s
                pred = apply_class_scales(proba, trial)
                sc = class_scores(y, pred)
                if any(sc["precision"][k] < f for k, f in floors.items() if (pred == k).any()):
                    continue
                score = float(sc["f1"][SCORED_IDX].mean())
                if score > best + 1e-6:
                    best, scales, changed = score, trial, True
        if not changed:
            break
    return scales


def nested_scale_cv(y: np.ndarray, proba: np.ndarray, folds, **fit_kwargs):
    """Honest estimate of tuned-scale performance.

    For every fold the scales are fitted on the other folds' out-of-fold
    probabilities and applied to this fold. Returns (predictions, scales per fold).
    """
    pred = np.zeros(len(y), dtype=int)
    all_scales = []
    for _, va in folds:
        rest = np.setdiff1d(np.arange(len(y)), va)
        s = fit_class_scales(y[rest], proba[rest], **fit_kwargs)
        pred[va] = apply_class_scales(proba[va], s)
        all_scales.append(s)
    return pred, np.array(all_scales)


def tradeoff_curve(y: np.ndarray, proba: np.ndarray, cls: str, scales_base=None,
                   grid=DEFAULT_GRID) -> dict:
    """Precision and recall of class ``cls`` as only its scale is swept."""
    c = CLASSES.index(cls)
    base = np.ones(len(CLASSES)) if scales_base is None else np.array(scales_base, dtype=float)
    prec, rec = [], []
    for s in grid:
        sc = base.copy()
        sc[c] = s
        r = class_scores(y, apply_class_scales(proba, sc))
        prec.append(float(r["precision"][c]))
        rec.append(float(r["recall"][c]))
    return {"scale": [float(g) for g in grid], "precision": prec, "recall": rec}
