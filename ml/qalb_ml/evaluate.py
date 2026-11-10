"""Evaluation metrics and figures."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_recall_fscore_support)

from .config import CLASSES

# Classes with enough beats in both DS1 and DS2 to be scored meaningfully.
SCORED = ["N", "S", "V", "F"]


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    labels = list(range(len(CLASSES)))
    p, r, f, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0)
    per_class = {
        c: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]),
            "support": int(support[i])}
        for i, c in enumerate(CLASSES)
    }
    scored_idx = [CLASSES.index(c) for c in SCORED]
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_f1_scored": float(np.mean(f[scored_idx])),
        "macro_f1_all5": float(f1_score(y_true, y_pred, labels=labels, average="macro",
                                        zero_division=0)),
        "v_sensitivity": per_class["V"]["recall"],
        "s_sensitivity": per_class["S"]["recall"],
        "per_class": per_class,
        "confusion_matrix": cm.tolist(),
        "classes": CLASSES,
        "scored_classes": SCORED,
    }


def save_metrics(metrics: dict, path: Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metrics, indent=2))


def format_report(name: str, m: dict) -> str:
    """Plain-text table of per-class scores."""
    lines = [f"{name}", f"{'class':<6}{'prec':>8}{'recall':>8}{'f1':>8}{'n':>8}"]
    for c in CLASSES:
        d = m["per_class"][c]
        lines.append(f"{c:<6}{d['precision']:>8.3f}{d['recall']:>8.3f}{d['f1']:>8.3f}{d['support']:>8d}")
    lines.append(f"accuracy {m['accuracy']:.4f}  macro-F1 (N,S,V,F) {m['macro_f1_scored']:.4f}  "
                 f"V sens {m['v_sensitivity']:.3f}  S sens {m['s_sensitivity']:.3f}")
    return "\n".join(lines)
