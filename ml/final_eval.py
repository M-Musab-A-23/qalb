"""Step 7: fit every stage on all of DS1 and score DS2 once.

    python final_eval.py --dry-run   # rehearsal: scores a held-out slice of DS1, never DS2
    python final_eval.py             # the one DS2 run; also saves the packaged model

All choices (feature set, imbalance strategy, boosting parameters, thresholds,
ensemble weight, which stage is final) come from the DS1 cross-validation
results in reports/experiments/. Nothing here reads DS2 labels before the
final scoring call.
"""
from __future__ import annotations

import argparse
import json

import joblib
import numpy as np

from experiments.common import feature_matrices, load_result, save_result
from experiments.step2_imbalance import STRATEGIES
from qalb_ml import plots
from qalb_ml.cnn import predict_proba_cnn, save_cnn, train_cnn
from qalb_ml.config import CLASSES, MODEL_DIR, REPORT_DIR
from qalb_ml.cv import full_proba
from qalb_ml.ensemble import blend_probabilities
from qalb_ml.evaluate import compute_metrics, save_metrics
from qalb_ml.imbalance import focal_weights, oversample_indices, power_class_weights
from qalb_ml.models import gradient_boosting
from qalb_ml.thresholds import apply_class_scales

MODEL_VERSION = "2.0"


def fit_boosting(X, y, groups, strategy, kw, params):
    """Boosting model trained on all of ``X`` with the chosen imbalance strategy."""
    from experiments.step2_imbalance import first_stage_p_true

    Xf, yf, w = X, y, None
    if strategy == "weights":
        w = power_class_weights(y, kw.get("power", 1.0))
    elif strategy == "oversample":
        idx = oversample_indices(y, kw.get("frac", 0.25))
        Xf, yf = X[idx], y[idx]
        w = power_class_weights(yf, kw["power"]) if kw.get("power") else None
    elif strategy == "focal":
        w = focal_weights(y, first_stage_p_true(X, y, groups), gamma=kw["gamma"],
                          power=kw.get("power", 1.0))
    model = gradient_boosting()
    if params:
        model.set_params(**params)
    return model.fit(Xf, yf, sample_weight=w)


def stage_predictions(train: dict, test: dict, sel: dict) -> tuple[dict, dict]:
    """Fit every stage on ``train`` and return {stage: predicted classes} for ``test``,
    plus the fitted objects needed for packaging."""
    s1, s2 = load_result("step1_features"), load_result("step2_imbalance")
    s3, s4, s6 = (load_result(n) for n in ("step3_thresholds", "step4_tuning", "step6_ensemble"))
    fs = s1["chosen_feature_set"]
    y, g = train["y"], train["groups"]
    strat, kw = STRATEGIES[s2["chosen_strategy"]]
    ones = np.ones(len(CLASSES))
    preds, objs = {}, {}

    def hgb(X_tr, X_te, strategy, kws, params):
        m = fit_boosting(X_tr, y, g, strategy, kws, params)
        return m, full_proba(m, X_te)

    _, p = hgb(train["X1"], test["X1"], "weights", {"power": 1.0}, None)
    preds["baseline (v1 features, balanced boosting)"] = p.argmax(axis=1)
    m_f, p_f = hgb(train[fs], test[fs], "weights", {"power": 1.0}, None)
    preds["1 richer features"] = p_f.argmax(axis=1)
    m2, p2 = hgb(train[fs], test[fs], strat, kw, None)
    preds[f"2 imbalance: {s2['chosen_strategy']}"] = p2.argmax(axis=1)
    preds["3 decision thresholds"] = apply_class_scales(p2, np.array(s3["chosen_scales"]))
    m4, p4 = (m2, p2) if not s6["tuned_boosting_used"] else hgb(train[fs], test[fs], strat, kw,
                                                                 s6["boosting_params"])
    scales_b = np.array(s6["stages"]["boosting_tuned_thresholds"]["scales"])
    preds["4 tuned boosting + thresholds"] = apply_class_scales(p4, scales_b)
    cnn = train_cnn(train["beats"], np.hstack([train["rr"], train["ctx"]]), y, g)
    p_c = predict_proba_cnn(cnn, test["beats"], np.hstack([test["rr"], test["ctx"]]))
    preds["5 CNN alone"] = p_c.argmax(axis=1)
    p_e = blend_probabilities([p4, p_c], [s6["w_boost"], 1 - s6["w_boost"]])
    scales_e = np.array(s6["stages"]["ensemble_thresholds"]["scales"])
    preds["6 ensemble + thresholds"] = apply_class_scales(p_e, scales_e)
    objs.update(boost=m4, cnn=cnn, scales_boost=scales_b, scales_ens=scales_e, w=s6["w_boost"],
                feature_set=fs)
    return preds, objs


def package(objs: dict, sel: dict, n_features: int) -> dict:
    """Write the model files for the selected stage and return a description."""
    MODEL_DIR.mkdir(exist_ok=True)
    uses_cnn = sel["uses_cnn"]
    bundle = {"model": objs["boost"], "classes": CLASSES, "n_features": n_features,
              "version": MODEL_VERSION, "feature_set": objs["feature_set"].replace("X", "v"),
              "scales_boosting_only": objs["scales_boost"], "fallback_name": "gradient_boosting",
              "name": "gradient_boosting", "scales": objs["scales_boost"]}
    if uses_cnn:
        bundle["name"] = "boosting_cnn_ensemble"
        bundle["ensemble"] = {"cnn_file": "qalb_beat_cnn.pt", "w_boost": objs["w"]}
        bundle["scales"] = objs["scales_ens"]
        save_cnn(objs["cnn"], MODEL_DIR / "qalb_beat_cnn.pt")
    joblib.dump(bundle, MODEL_DIR / "qalb_beat_classifier.joblib", compress=3)
    return {"name": bundle["name"], "uses_cnn": uses_cnn}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="rehearse on a grouped split of DS1; DS2 is not loaded")
    args = ap.parse_args(argv)
    train = feature_matrices("ds1")
    sel = load_result("selection")
    if args.dry_run:
        from qalb_ml.cnn import grouped_val_split
        tr, te = grouped_val_split(train["y"], train["groups"], frac=0.25, seed=1)
        pick = lambda d, i: {k: v[i] for k, v in d.items()}
        train, test = pick(train, tr), pick(train, te)
    else:
        test = feature_matrices("ds2")
    preds, objs = stage_predictions(train, test, sel)
    results = {name: compute_metrics(test["y"], p) for name, p in preds.items()}
    tag = "dryrun" if args.dry_run else "final"
    save_metrics({"evaluated_on": "held-out slice of DS1" if args.dry_run else "DS2",
                  "selected_stage": sel["chosen_stage"], "stages": results},
                 REPORT_DIR / f"{tag}_metrics.json")
    for name, r in results.items():
        print(f"{name:<46} macro-F1 {r['macro_f1_scored']:.3f}  S {r['s_sensitivity']:.3f} "
              f"V {r['v_sensitivity']:.3f} F {r['per_class']['F']['recall']:.3f}")
    if not args.dry_run:
        info = package(objs, sel, train[objs["feature_set"]].shape[1])
        print("packaged:", json.dumps(info))
        final = {"boosting_tuned_thresholds": "4 tuned boosting + thresholds",
                 "cnn_thresholds": "5 CNN alone",
                 "ensemble_thresholds": "6 ensemble + thresholds"}[sel["chosen_stage"]]
        final = [n for n in results if n.startswith(final.split(" ")[0] + " ")][0]
        plots.plot_confusion(results[final]["confusion_matrix"], REPORT_DIR / "confusion_final.png",
                             f"{final} on DS2")
        plots.plot_confusion(results[final]["confusion_matrix"],
                             REPORT_DIR / "confusion_final_normalised.png",
                             f"{final} on DS2 (row-normalised)", normalise=True)
        save_result("final_stage", {"final": final})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
