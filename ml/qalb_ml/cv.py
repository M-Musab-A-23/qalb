"""Patient-grouped cross-validation helpers. Used on DS1 only."""
from __future__ import annotations

import numpy as np
from sklearn.model_selection import GroupKFold

from .config import CLASSES
from .evaluate import compute_metrics

N_FOLDS = 4


def grouped_folds(groups: np.ndarray, n_splits: int = N_FOLDS) -> list[tuple[np.ndarray, np.ndarray]]:
    """Deterministic patient-grouped folds (no record is in train and validation)."""
    dummy = np.zeros(len(groups))
    return list(GroupKFold(n_splits=n_splits).split(dummy, dummy, groups))


def full_proba(model, X: np.ndarray, n_classes: int = len(CLASSES)) -> np.ndarray:
    """``predict_proba`` as an (n, n_classes) array even if a class was missing in training."""
    out = np.zeros((len(X), n_classes))
    out[:, list(model.classes_)] = model.predict_proba(X)
    return out


def oof_proba(fit_predict, X: np.ndarray, y: np.ndarray, folds) -> np.ndarray:
    """Out-of-fold class probabilities.

    ``fit_predict(X_train, y_train, X_val, train_idx)`` returns an
    (n_val, n_classes) probability array. Everything the callback learns
    (weights, oversampling, scalers) must come from the training part only.
    """
    out = np.zeros((len(y), len(CLASSES)))
    for tr, va in folds:
        out[va] = fit_predict(X[tr], y[tr], X[va], tr)
    return out


def fold_macro_f1(y: np.ndarray, pred: np.ndarray, folds) -> list[float]:
    """Macro-F1 over N, S, V, F on each validation fold."""
    return [compute_metrics(y[va], pred[va])["macro_f1_scored"] for _, va in folds]


def summarise(y: np.ndarray, proba: np.ndarray, folds, pred: np.ndarray | None = None) -> dict:
    """Cross-validation summary: mean/std fold macro-F1 and pooled per-class scores."""
    pred = proba.argmax(axis=1) if pred is None else pred
    scores = fold_macro_f1(y, pred, folds)
    pooled = compute_metrics(y, pred)
    return {
        "macro_f1_mean": float(np.mean(scores)), "macro_f1_std": float(np.std(scores)),
        "fold_macro_f1": [float(s) for s in scores],
        "pooled_macro_f1": pooled["macro_f1_scored"],
        "per_class": {c: pooled["per_class"][c] for c in ["N", "S", "V", "F"]},
        "s_recall": pooled["s_sensitivity"], "v_recall": pooled["v_sensitivity"],
        "f_recall": pooled["per_class"]["F"]["recall"],
    }
