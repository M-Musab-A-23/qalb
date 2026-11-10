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


def plot_class_f1(all_metrics: dict, path: Path) -> None:
    """Grouped bars of F1 per scored class for each model."""
    classes = ["N", "S", "V", "F"]
    names = list(all_metrics)
    width = 0.8 / len(names)
    palette = [BLUE, ORANGE, "#3d9970", GREY, "#8e5ea2"]
    fig, ax = plt.subplots(figsize=(6.5, 3.8))
    for k, n in enumerate(names):
        vals = [all_metrics[n]["per_class"][c]["f1"] for c in classes]
        ax.bar(np.arange(len(classes)) + k * width, vals, width, label=n,
               color=palette[k % len(palette)])
    ax.set_xticks(np.arange(len(classes)) + width * (len(names) - 1) / 2, classes)
    ax.set_ylabel("F1 on DS2")
    ax.set_ylim(0, 1.05)
    ax.legend(frameon=False, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)


def plot_sensitivity(all_metrics: dict, path: Path) -> None:
    """V and S sensitivity per model."""
    names = list(all_metrics)
    x = np.arange(len(names))
    fig, ax = plt.subplots(figsize=(6.5, 3.8))
    ax.bar(x - 0.2, [all_metrics[n]["v_sensitivity"] for n in names], 0.4,
           label="V sensitivity", color=BLUE)
    ax.bar(x + 0.2, [all_metrics[n]["s_sensitivity"] for n in names], 0.4,
           label="S sensitivity", color=ORANGE)
    ax.set_xticks(x, names, fontsize=8)
    ax.set_ylim(0, 1.05)
    ax.legend(frameon=False, fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)


def plot_class_distribution(counts_ds1, counts_ds2, path: Path) -> None:
    x = np.arange(len(CLASSES))
    fig, ax = plt.subplots(figsize=(6, 3.6))
    ax.bar(x - 0.2, counts_ds1, 0.4, label="DS1 (train)", color=BLUE)
    ax.bar(x + 0.2, counts_ds2, 0.4, label="DS2 (test)", color=ORANGE)
    ax.set_yscale("log")
    ax.set_xticks(x, CLASSES)
    ax.set_ylabel("beats (log scale)")
    ax.legend(frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)


def plot_tradeoff(curves: dict, chosen: dict, path: Path, title: str) -> None:
    """Precision against recall as one class's scale is swept.

    ``curves`` maps a class name to ``thresholds.tradeoff_curve`` output;
    ``chosen`` maps the class name to ``{"default": (recall, precision),
    "tuned": (recall, precision)}`` so the two operating points are marked.
    """
    fig, axes = plt.subplots(1, len(curves), figsize=(4.6 * len(curves), 4.2), squeeze=False)
    for ax, (cls, c) in zip(axes[0], curves.items()):
        ax.plot(c["recall"], c["precision"], color=BLUE, lw=2)
        pts = chosen[cls]
        ax.scatter(*pts["default"], color=GREY, s=60, zorder=3, label="scale 1 (argmax)")
        ax.scatter(*pts["tuned"], color=ORANGE, s=60, zorder=3, label="tuned scale")
        ax.set_xlabel(f"{cls} recall")
        ax.set_ylabel(f"{cls} precision")
        ax.set_xlim(0, 1.02)
        ax.set_ylim(0, 1.02)
        ax.set_title(f"{cls}: precision / recall trade-off")
        ax.grid(alpha=0.25)
        ax.legend(loc="upper right", fontsize=8)
    fig.suptitle(title, fontsize=10)
    fig.tight_layout()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=150)
    plt.close(fig)
