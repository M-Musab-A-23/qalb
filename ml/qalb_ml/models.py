"""Model factories. Class imbalance is handled with class weights."""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

SEED = 42


def baseline_logreg() -> object:
    """Standardised multinomial logistic regression with balanced weights."""
    return make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=2000, class_weight="balanced", C=0.5),
    )


def random_forest() -> object:
    return RandomForestClassifier(
        n_estimators=300, min_samples_leaf=2, max_features="sqrt",
        class_weight="balanced_subsample", n_jobs=-1, random_state=SEED,
    )


def gradient_boosting() -> object:
    """Histogram gradient boosting; fit it with ``balanced_sample_weight``."""
    return HistGradientBoostingClassifier(
        max_iter=250, learning_rate=0.08, max_leaf_nodes=24,
        l2_regularization=1.0, random_state=SEED,
    )


def neural_net() -> object:
    """Small MLP on the feature vector, used as the neural comparison."""
    return make_pipeline(
        StandardScaler(),
        MLPClassifier(hidden_layer_sizes=(128, 64), alpha=1e-3, early_stopping=True,
                      max_iter=200, random_state=SEED),
    )


def balanced_sample_weight(y: np.ndarray) -> np.ndarray:
    """Per-sample weights inversely proportional to class frequency."""
    return compute_sample_weight("balanced", y)


def fit_model(model, X: np.ndarray, y: np.ndarray, weighted: bool = False):
    """Fit, optionally passing balanced sample weights (pipelines get them on the last step)."""
    if weighted:
        w = balanced_sample_weight(y)
        if hasattr(model, "steps"):
            model.fit(X, y, **{f"{model.steps[-1][0]}__sample_weight": w})
        else:
            model.fit(X, y, sample_weight=w)
    else:
        model.fit(X, y)
    return model


MODEL_FACTORIES = {
    "logreg": (baseline_logreg, False),
    "random_forest": (random_forest, False),
    "gradient_boosting": (gradient_boosting, True),
    "mlp": (neural_net, False),
}


def oversample(X: np.ndarray, y: np.ndarray, target: int = 6000, seed: int = SEED):
    """Randomly repeat minority-class rows up to ``target`` per class (never shrinks)."""
    rng = np.random.default_rng(seed)
    idx = []
    for c in np.unique(y):
        rows = np.flatnonzero(y == c)
        idx.append(rows)
        if len(rows) < target:
            idx.append(rng.choice(rows, target - len(rows), replace=True))
    idx = np.concatenate(idx)
    rng.shuffle(idx)
    return X[idx], y[idx]
