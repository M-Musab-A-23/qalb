"""Step 3: per-class decision scales, fitted on DS1 out-of-fold probabilities only."""
from __future__ import annotations

import numpy as np

from experiments.common import ds1_folds, feature_matrices, load_result, log, save_result
from qalb_ml.config import CACHE_DIR, REPORT_DIR
from qalb_ml.cv import summarise
from qalb_ml.plots import plot_tradeoff
from qalb_ml.thresholds import (apply_class_scales, class_scores, fit_class_scales,
                                nested_scale_cv, tradeoff_curve)

VARIANTS = {
    "macro-F1": {},
    "macro-F1, S and F precision >= 0.2": {"min_precision": {"S": 0.2, "F": 0.2}},
}


MARGIN = 0.005   # thresholds must beat plain argmax by this much in nested CV to be used
NONE = "none (argmax)"


def pick_variant(y, proba, folds):
    """Fit every variant with nested CV and choose one; argmax wins unless clearly beaten.

    Returns (chosen name, {name: summary}) where each summary has the nested
    CV scores and the scales fitted on all of the given data.
    """
    results = {NONE: {**summarise(y, proba, folds), "scales_all_ds1": [1.0] * 5}}
    for name, kw in VARIANTS.items():
        pred, fold_scales = nested_scale_cv(y, proba, folds, **kw)
        r = summarise(y, proba, folds, pred=pred)       # scales fitted outside each fold
        r["scales_all_ds1"] = [float(s) for s in fit_class_scales(y, proba, **kw)]
        r["scales_per_fold"] = fold_scales.round(3).tolist()
        results[name] = r
    best = NONE
    for name in VARIANTS:
        if results[name]["macro_f1_mean"] > results[best]["macro_f1_mean"] + MARGIN:
            best = name
    return best, results


def point(y, proba, scales, cls):
    c = {"S": 1, "V": 2, "F": 3}[cls]
    sc = class_scores(y, apply_class_scales(proba, scales))
    return float(sc["recall"][c]), float(sc["precision"][c])


def main():
    d = feature_matrices("ds1")
    y, folds = d["y"], ds1_folds(d)
    step2 = load_result("step2_imbalance")
    key = step2["chosen_strategy"].replace(" ", "_")
    proba = np.load(CACHE_DIR / "oof_step2.npz")[key]
    best, variants = pick_variant(y, proba, folds)
    out = {"probabilities_from": step2["chosen_strategy"], "variants": variants,
           "chosen_variant": best, "chosen_scales": variants[best]["scales_all_ds1"]}
    for name, r in variants.items():
        log(f"{name:<36} macro-F1 {r['macro_f1_mean']:.3f} +/- {r['macro_f1_std']:.3f}  "
            f"S {r['s_recall']:.3f} (p {r['per_class']['S']['precision']:.2f})  "
            f"F {r['f_recall']:.3f} (p {r['per_class']['F']['precision']:.2f})  "
            f"scales {np.round(r['scales_all_ds1'], 2)}")
    log(f"chosen: {best}")
    scales = np.array(out["chosen_scales"])
    shown = np.array(variants["macro-F1"]["scales_all_ds1"]) if best == NONE else scales
    curves = {c: tradeoff_curve(y, proba, c, scales_base=shown) for c in ("S", "F")}
    marks = {c: {"default": point(y, proba, np.ones(5), c), "tuned": point(y, proba, shown, c)}
             for c in ("S", "F")}
    plot_tradeoff(curves, marks, REPORT_DIR / "threshold_tradeoff.png",
                  f"DS1 out-of-fold; scales fitted on DS1, adopted: {best}")
    out["tradeoff"] = {"curves": curves, "points": marks}
    save_result("step3_thresholds", out)


if __name__ == "__main__":
    main()
