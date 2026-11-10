"""Step 2: class weights, oversampling and focal weighting. Grouped CV on DS1 only.

Oversampling and the focal first stage happen inside each training fold; the
validation fold is never touched.
"""
from __future__ import annotations

import numpy as np

from experiments.common import (Timer, ds1_folds, feature_matrices, load_result, log, save_result)
from qalb_ml.config import CACHE_DIR
from qalb_ml.cv import full_proba, grouped_folds, oof_proba, summarise
from qalb_ml.imbalance import focal_weights, oversample_indices, power_class_weights
from qalb_ml.models import gradient_boosting


def fit_predict_factory(strategy: str, groups: np.ndarray, params: dict | None = None, **kw):
    """Return a ``oof_proba`` callback for one imbalance strategy."""

    def run(Xtr, ytr, Xva, tr_idx):
        Xfit, yfit, w = Xtr, ytr, None
        if strategy == "none":
            w = None
        elif strategy == "weights":
            w = power_class_weights(ytr, kw.get("power", 1.0))
        elif strategy == "oversample":
            idx = oversample_indices(ytr, kw.get("frac", 0.25))
            Xfit, yfit = Xtr[idx], ytr[idx]
            w = power_class_weights(yfit, kw["power"]) if kw.get("power") else None
        elif strategy == "focal":
            w = focal_weights(ytr, first_stage_p_true(Xtr, ytr, groups[tr_idx]),
                              gamma=kw["gamma"], power=kw.get("power", 1.0))
        model = gradient_boosting()
        if params:
            model.set_params(**params)
        model.fit(Xfit, yfit, sample_weight=w)
        return full_proba(model, Xva)

    return run


def first_stage_p_true(X, y, groups, folds: int = 3) -> np.ndarray:
    """Cross-fitted probability of the true class inside the training part only."""
    p = np.zeros(len(y))
    for tr, va in grouped_folds(groups, folds):
        m = gradient_boosting().set_params(max_iter=80)
        m.fit(X[tr], y[tr], sample_weight=power_class_weights(y[tr]))
        proba = full_proba(m, X[va])
        p[va] = proba[np.arange(len(va)), y[va]]
    return p


STRATEGIES = {
    "no weighting": ("none", {}),
    "balanced weights": ("weights", {"power": 1.0}),
    "sqrt-balanced weights": ("weights", {"power": 0.5}),
    "oversample to 25% of N": ("oversample", {"frac": 0.25}),
    "oversample to 50% of N": ("oversample", {"frac": 0.5}),
    "focal gamma=1": ("focal", {"gamma": 1.0}),
    "focal gamma=2": ("focal", {"gamma": 2.0}),
}


def main():
    d = feature_matrices("ds1")
    fs_name = load_result("step1_features")["chosen_feature_set"]
    X = d[fs_name]
    y, folds, groups = d["y"], ds1_folds(d), d["groups"]
    out, oofs = {"feature_set": fs_name}, {}
    for name, (strategy, kw) in STRATEGIES.items():
        with Timer() as t:
            proba = oof_proba(fit_predict_factory(strategy, groups, **kw), X, y, folds)
        out[name] = {**summarise(y, proba, folds), "seconds": round(t.seconds)}
        oofs[name] = proba
        r = out[name]
        log(f"{name:<24} macro-F1 {r['macro_f1_mean']:.3f} +/- {r['macro_f1_std']:.3f}"
            f"  S {r['s_recall']:.3f}  V {r['v_recall']:.3f}  F {r['f_recall']:.3f}")
    best = max(STRATEGIES, key=lambda n: out[n]["macro_f1_mean"])
    out["chosen_strategy"] = best
    log(f"chosen: {best}")
    save_result("step2_imbalance", out)
    np.savez_compressed(CACHE_DIR / "oof_step2.npz", **{k.replace(" ", "_"): v for k, v in oofs.items()})


if __name__ == "__main__":
    main()
