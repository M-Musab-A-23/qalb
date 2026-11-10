import logging

import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier

import qalb_ml.inference as inf
from conftest import synthetic_ecg
from qalb_ml.config import CLASSES
from qalb_ml.features import rr_features
from qalb_ml.features_v2 import rr_context, window_features_v2
from qalb_ml.preprocess import clean_signal, detect_r_peaks, segment_beats


@pytest.fixture(scope="module")
def window():
    clean = clean_signal(synthetic_ecg(seconds=30), 360)
    return clean, detect_r_peaks(clean, 360)


@pytest.fixture(scope="module")
def forest(window):
    clean, peaks = window
    X, kept = window_features_v2(clean, peaks)
    y = np.arange(len(kept)) % 3
    return RandomForestClassifier(n_estimators=10, random_state=0).fit(X, y)


def make_bundle(forest, cnn_file=None, scales=None):
    b = {"model": forest, "name": "boosting_cnn_ensemble", "fallback_name": "gradient_boosting",
         "version": "t", "feature_set": "v2", "classes": CLASSES,
         "scales_boosting_only": np.ones(5)}
    if cnn_file:
        b["ensemble"] = {"cnn_file": cnn_file, "w_boost": 0.5}
        b["scales"] = np.ones(5) if scales is None else np.asarray(scales)
    return b


def test_boosting_only_bundle(window, forest, tmp_path):
    clean, peaks = window
    kept, proba, pred = inf.classify_window(clean, peaks, make_bundle(forest), tmp_path)
    assert proba.shape == (len(kept), 5) and np.allclose(proba.sum(axis=1), 1)
    assert pred.shape == (len(kept),)


def test_missing_torch_falls_back_to_boosting_with_log_line(window, forest, tmp_path, monkeypatch, caplog):
    clean, peaks = window
    monkeypatch.setattr(inf, "torch_available", lambda: False)
    bundle = make_bundle(forest, cnn_file="cnn.pt")
    with caplog.at_level(logging.WARNING, logger="qalb.inference"):
        kept, proba, _ = inf.classify_window(clean, peaks, bundle, tmp_path)
    assert "torch is not installed" in caplog.text
    ref = inf.classify_window(clean, peaks, make_bundle(forest), tmp_path)[1]
    assert np.allclose(proba, ref)
    assert inf.active_model_name(bundle, tmp_path) == "gradient_boosting"


def test_missing_cnn_file_falls_back(window, forest, tmp_path, caplog):
    clean, peaks = window
    bundle = make_bundle(forest, cnn_file="absent.pt")
    pytest.importorskip("torch")
    with caplog.at_level(logging.WARNING, logger="qalb.inference"):
        _, proba, _ = inf.classify_window(clean, peaks, bundle, tmp_path)
    assert "not found" in caplog.text and proba.shape[1] == 5


def test_ensemble_blends_cnn_and_applies_scales(window, forest, tmp_path):
    pytest.importorskip("torch")
    from qalb_ml.cnn import save_cnn, train_cnn

    clean, peaks = window
    beats, kept = segment_beats(clean, peaks)
    idx = np.searchsorted(peaks, kept)
    rr = np.hstack([rr_features(peaks)[idx], rr_context(peaks)[idx]])
    y = np.arange(len(kept)) % 3
    groups = np.repeat(np.arange(len(kept) // 5 + 1), 5)[:len(kept)]
    save_cnn(train_cnn(beats, rr, y, groups, max_epochs=2, seed=1), tmp_path / "cnn.pt")

    bundle = make_bundle(forest, cnn_file="cnn.pt")
    _, proba, pred = inf.classify_window(clean, peaks, bundle, tmp_path)
    solo = inf.classify_window(clean, peaks, make_bundle(forest), tmp_path)[1]
    assert proba.shape == solo.shape and not np.allclose(proba, solo)
    assert inf.active_model_name(bundle, tmp_path) == "boosting_cnn_ensemble"

    boosted = make_bundle(forest, cnn_file="cnn.pt", scales=[1, 1000, 1, 1, 1])
    _, _, pred_b = inf.classify_window(clean, peaks, boosted, tmp_path)
    assert (pred_b == 1).all()
