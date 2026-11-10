"""Step 6: blend boosting and CNN probabilities, then pick the final configuration.

Everything here uses DS1 out-of-fold probabilities. The final choice among
the stages is made by cross-validated macro-F1 and written to selection.json
before DS2 is looked at.
"""
from __future__ import annotations

import numpy as np

from experiments.common import ds1_folds, feature_matrices, load_result, log, save_result
from qalb_ml.config import CACHE_DIR
from qalb_ml.cv import summarise
from qalb_ml.ensemble import blend_probabilities, choose_blend_weight
from qalb_ml.thresholds import fit_class_scales, nested_scale_cv
from experiments.step3_thresholds import VARIANTS


def tuned_stage(y, proba, folds, kw):
    """Nested-CV summary of thresholded probabilities plus scales fitted on all of DS1."""
    pred, _ = nested_scale_cv(y, proba, folds, **kw)
    r = summarise(y, proba, folds, pred=pred)
    r["scales"] = [float(s) for s in fit_class_scales(y, proba, **kw)]
    return r


def main():
    d = feature_matrices("ds1")
    y, folds = d["y"], ds1_folds(d)
    s2, s3, s4 = (load_result(n) for n in ("step2_imbalance", "step3_thresholds", "step4_tuning"))
    kw = VARIANTS[s3["chosen_variant"]]

    default_oof = np.load(CACHE_DIR / "oof_step2.npz")[s2["chosen_strategy"].replace(" ", "_")]
    tuned_better = s4["best"]["macro_f1_mean"] > s2[s2["chosen_strategy"]]["macro_f1_mean"]
    boost_oof = np.load(CACHE_DIR / "oof_step4.npy") if tuned_better else default_oof
    boost_params = s4["best_params"] if tuned_better else {}
    cnn_oof = np.load(CACHE_DIR / "oof_step5.npy")
    log(f"boosting used: {'tuned' if tuned_better else 'default'} {boost_params}")

    w_boost, grid_scores = choose_blend_weight(y, boost_oof, cnn_oof, folds)
    ens_oof = blend_probabilities([boost_oof, cnn_oof], [w_boost, 1 - w_boost])
    log(f"ensemble weight on boosting: {w_boost}")

    stages = {
        "boosting_tuned_argmax": summarise(y, boost_oof, folds),
        "boosting_tuned_thresholds": tuned_stage(y, boost_oof, folds, kw),
        "cnn_argmax": summarise(y, cnn_oof, folds),
        "cnn_thresholds": tuned_stage(y, cnn_oof, folds, kw),
        "ensemble_argmax": summarise(y, ens_oof, folds),
        "ensemble_thresholds": tuned_stage(y, ens_oof, folds, kw),
    }
    for name, r in stages.items():
        log(f"{name:<28} macro-F1 {r['macro_f1_mean']:.3f} +/- {r['macro_f1_std']:.3f}  "
            f"S {r['s_recall']:.3f} V {r['v_recall']:.3f} F {r['f_recall']:.3f}")
    save_result("step6_ensemble", {"w_boost": w_boost, "weight_grid_scores": grid_scores,
                                   "boosting_params": boost_params, "tuned_boosting_used": tuned_better,
                                   "stages": stages, "threshold_variant": s3["chosen_variant"]})

    # Final choice: best nested-CV macro-F1 among the end-of-pipeline candidates.
    candidates = ["boosting_tuned_thresholds", "cnn_thresholds", "ensemble_thresholds"]
    chosen = max(candidates, key=lambda n: stages[n]["macro_f1_mean"])
    uses_cnn = chosen != "boosting_tuned_thresholds"
    save_result("selection", {
        "chosen_stage": chosen, "uses_cnn": uses_cnn,
        "feature_set": load_result("step1_features")["chosen_feature_set"],
        "imbalance_strategy": s2["chosen_strategy"], "boosting_params": boost_params,
        "w_boost": w_boost if chosen == "ensemble_thresholds" else (0.0 if chosen == "cnn_thresholds" else 1.0),
        "scales": stages[chosen]["scales"],
        "scales_boosting_only": stages["boosting_tuned_thresholds"]["scales"],
        "cv_macro_f1": stages[chosen]["macro_f1_mean"], "threshold_variant": s3["chosen_variant"]})
    log(f"selected: {chosen} (decided on DS1 cross-validation only)")


if __name__ == "__main__":
    main()
