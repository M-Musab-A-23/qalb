"""Reproduce the whole pipeline: features, model selection, test report, saved model.

    python train.py            # full run
    python train.py --quick    # smaller models, for a smoke test

Model selection uses patient-grouped cross-validation on DS1 only. DS2 is
scored once at the end and never used to choose or tune anything.
"""
from __future__ import annotations

import argparse
import json
import time

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.model_selection import GroupKFold

from qalb_ml.config import CLASSES, MODEL_DIR, REPORT_DIR
from qalb_ml.dataset import load_ds1, load_ds2
from qalb_ml.evaluate import SCORED, compute_metrics, format_report, save_metrics
from qalb_ml.models import MODEL_FACTORIES, fit_model, oversample
from qalb_ml import plots

MODEL_VERSION = "1.0"


def fit_one(name, X, y, quick=False):
    factory, weighted = MODEL_FACTORIES[name]
    model = factory()
    if quick and name == "random_forest":
        model.set_params(n_estimators=60)
    if quick and name == "gradient_boosting":
        model.set_params(max_iter=60)
    if name == "mlp":
        X, y = oversample(X, y)
    return fit_model(model, X, y, weighted)


def scored_macro_f1(y_true, y_pred):
    return compute_metrics(y_true, y_pred)["macro_f1_scored"]


def cross_validate(name, X, y, groups, quick=False, folds=4):
    scores = []
    for tr, va in GroupKFold(n_splits=folds).split(X, y, groups):
        m = fit_one(name, X[tr], y[tr], quick)
        scores.append(scored_macro_f1(y[va], m.predict(X[va])))
    return float(np.mean(scores)), float(np.std(scores))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--models", nargs="*", default=list(MODEL_FACTORIES))
    ap.add_argument("--no-cache", action="store_true")
    args = ap.parse_args()

    t0 = time.time()
    X1, y1, g1 = load_ds1(cache=not args.no_cache)
    X2, y2, _ = load_ds2(cache=not args.no_cache)
    print(f"DS1 {X1.shape}  DS2 {X2.shape}  ({time.time() - t0:.0f}s)")
    plots.plot_class_distribution(np.bincount(y1, minlength=5), np.bincount(y2, minlength=5),
                                  REPORT_DIR / "class_distribution.png")

    # 1. model selection on DS1 only
    cv = {}
    for name in args.models:
        mean, std = cross_validate(name, X1, y1, g1, args.quick)
        cv[name] = {"macro_f1_mean": mean, "macro_f1_std": std}
        print(f"CV {name:<18} macro-F1 {mean:.3f} +/- {std:.3f}")
    best = max(cv, key=lambda n: cv[n]["macro_f1_mean"])
    print(f"selected: {best}")

    # 2. refit on all of DS1 and score DS2 once
    results, fitted = {}, {}
    for name in args.models:
        fitted[name] = fit_one(name, X1, y1, args.quick)
        results[name] = compute_metrics(y2, fitted[name].predict(X2))
        print(format_report(name, results[name]), "\n")
        plots.plot_confusion(results[name]["confusion_matrix"],
                             REPORT_DIR / f"confusion_{name}.png", f"{name} on DS2")
    bm = results[best]
    plots.plot_confusion(bm["confusion_matrix"], REPORT_DIR / "confusion_best.png",
                         f"{best} on DS2")
    plots.plot_confusion(bm["confusion_matrix"], REPORT_DIR / "confusion_best_normalised.png",
                         f"{best} on DS2 (row-normalised)", normalise=True)
    plots.plot_class_f1(results, REPORT_DIR / "f1_by_class.png")
    plots.plot_sensitivity(results, REPORT_DIR / "sensitivity_v_s.png")

    save_metrics({"selected_model": best, "cross_validation_ds1": cv, "test_ds2": results,
                  "scored_classes": SCORED, "model_version": MODEL_VERSION},
                 REPORT_DIR / "metrics.json")

    # 3. package the selected model
    MODEL_DIR.mkdir(exist_ok=True)
    out = MODEL_DIR / "qalb_beat_classifier.joblib"
    joblib.dump({"model": fitted[best], "name": best, "classes": CLASSES,
                 "n_features": int(X1.shape[1]), "version": MODEL_VERSION}, out, compress=3)
    print(f"saved {out} ({out.stat().st_size / 1e6:.1f} MB)  total {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
