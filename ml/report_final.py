"""Build the comparison table and figures from final_metrics.json and the DS1 CV results."""
from __future__ import annotations

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from experiments.common import load_result
from qalb_ml.config import REPORT_DIR
from qalb_ml.plots import BLUE, GREY, ORANGE

CV_KEY = {   # stage label prefix -> (experiment file, key) holding its DS1 CV summary
    "baseline": ("step1_features", "v1 (baseline)"),
    "1": ("step1_features", "v2 (all)"),
    "2": ("step2_imbalance", None),
    "3": ("step3_thresholds", None),
    "4": ("step6_ensemble", "boosting_tuned_thresholds"),
    "5": ("step6_ensemble", "cnn_argmax"),
    "6": ("step6_ensemble", "ensemble_thresholds"),
}


def cv_summary(prefix: str) -> dict | None:
    f, key = CV_KEY[prefix]
    r = load_result(f)
    if f == "step6_ensemble":
        return r["stages"][key]
    if f == "step2_imbalance":
        return r[r["chosen_strategy"]]
    if f == "step3_thresholds":
        return r[r["chosen_variant"]]
    return r[key]


def baseline_row() -> dict:
    """The original (version 1.0) gradient boosting result, kept as the baseline."""
    return json.loads((REPORT_DIR / "metrics.json").read_text())["test_ds2"]["gradient_boosting"]


def build_rows() -> list[dict]:
    final = json.loads((REPORT_DIR / "final_metrics.json").read_text())["stages"]
    rows = [{"stage": "baseline (v1 features, balanced boosting)", "prefix": "baseline",
             "ds2": baseline_row()}]
    for name, m in final.items():
        if name.startswith("baseline"):
            continue                       # the saved 1.0 metrics are used instead
        rows.append({"stage": name, "prefix": name.split(" ")[0], "ds2": m})
    for r in rows:
        r["cv"] = cv_summary(r["prefix"])
    return rows


def write_table(rows: list[dict], path) -> None:
    lines = ["| stage | CV macro-F1 (DS1) | DS2 macro-F1 | S recall | V recall | F recall | "
             "S prec | F prec | accuracy |", "|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        m, cv = r["ds2"], r["cv"]
        lines.append(
            f"| {r['stage']} | {cv['macro_f1_mean']:.3f} +/- {cv['macro_f1_std']:.3f} | "
            f"{m['macro_f1_scored']:.3f} | {m['s_sensitivity']:.3f} | {m['v_sensitivity']:.3f} | "
            f"{m['per_class']['F']['recall']:.3f} | {m['per_class']['S']['precision']:.2f} | "
            f"{m['per_class']['F']['precision']:.2f} | {m['accuracy']:.3f} |")
    path.write_text("\n".join(lines) + "\n")


def plot_stage_comparison(rows: list[dict], path) -> None:
    labels = [r["stage"].split(" ")[0] if r["prefix"] != "baseline" else "base" for r in rows]
    x = np.arange(len(rows))
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    cv = [r["cv"]["macro_f1_mean"] for r in rows]
    ds2 = [r["ds2"]["macro_f1_scored"] for r in rows]
    axes[0].bar(x - 0.2, cv, 0.4, color=GREY, label="DS1 cross-validation")
    axes[0].bar(x + 0.2, ds2, 0.4, color=BLUE, label="DS2 test")
    axes[0].set_title("macro-F1 (N, S, V, F)")
    w = 0.26
    for i, (cls, color) in enumerate([("S", ORANGE), ("V", BLUE), ("F", GREY)]):
        vals = [r["ds2"]["per_class"][cls]["recall"] for r in rows]
        axes[1].bar(x + (i - 1) * w, vals, w, color=color, label=f"{cls} recall")
    axes[1].set_title("recall on DS2")
    for ax in axes:
        ax.set_xticks(x, labels)
        ax.set_ylim(0, 1.02)
        ax.set_xlabel("stage (base = baseline)")
        ax.legend(fontsize=8)
        ax.grid(axis="y", alpha=0.25)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main():
    rows = build_rows()
    write_table(rows, REPORT_DIR / "comparison.md")
    plot_stage_comparison(rows, REPORT_DIR / "comparison_stages.png")
    print((REPORT_DIR / "comparison.md").read_text())


if __name__ == "__main__":
    main()
