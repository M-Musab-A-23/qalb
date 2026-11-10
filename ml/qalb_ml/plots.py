"""Figures for the evaluation reports."""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from .config import CLASSES

BLUE, ORANGE, GREY = "#2f6db5", "#d9822b", "#8a8f98"


def plot_confusion(cm, path: Path, title: str, normalise: bool = False) -> None:
    cm = np.asarray(cm, dtype=float)
    shown = cm / np.maximum(cm.sum(axis=1, keepdims=True), 1) if normalise else cm
    fig, ax = plt.subplots(figsize=(5.2, 4.4))
    im = ax.imshow(shown, cmap="Blues", vmin=0, vmax=1 if normalise else None)
    ax.set_xticks(range(len(CLASSES)), CLASSES)
    ax.set_yticks(range(len(CLASSES)), CLASSES)
    ax.set_xlabel("predicted")
    ax.set_ylabel("true")
    ax.set_title(title)
    top = shown.max() / 2 if shown.max() else 0.5
    for i in range(len(CLASSES)):
        for j in range(len(CLASSES)):
            txt = f"{shown[i, j]:.2f}" if normalise else f"{int(cm[i, j])}"
            ax.text(j, i, txt, ha="center", va="center", fontsize=8,
                    color="white" if shown[i, j] > top else "black")
    fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)
