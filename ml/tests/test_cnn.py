import numpy as np
import pytest

from qalb_ml.cnn import grouped_val_split, scale_rr, torch_available
from qalb_ml.config import BEAT_LEN, CLASSES

torch = pytest.importorskip("torch")
from qalb_ml.cnn import load_cnn, predict_proba_cnn, save_cnn, train_cnn  # noqa: E402


def toy_data(n=400, seed=0):
    rng = np.random.default_rng(seed)
    y = rng.choice([0, 1, 2], size=n, p=[0.6, 0.2, 0.2])
    k = np.arange(BEAT_LEN) - 90
    wave = np.array([np.exp(-(k / (4.0 + 6 * (c == 2))) ** 2) for c in y]) + 0.05 * rng.standard_normal((n, BEAT_LEN))
    rr = rng.standard_normal((n, 5)) + y[:, None] * 0.1
    groups = np.repeat(np.arange(20), n // 20)
    return wave, rr, y, groups


def test_grouped_val_split_never_shares_patients():
    wave, rr, y, groups = toy_data()
    tr, va = grouped_val_split(y, groups, frac=0.25, min_rare=5)
    assert not set(groups[tr]) & set(groups[va])
    assert len(tr) + len(va) == len(y)
    assert np.array_equal(va, grouped_val_split(y, groups, frac=0.25, min_rare=5)[1])


def test_scale_rr_clips():
    out = scale_rr(np.array([[100.0, 0.0]]), np.zeros(2), np.ones(2))
    assert out.max() <= 5.0 and out.dtype == np.float32


def test_train_predict_save_load_roundtrip(tmp_path):
    wave, rr, y, groups = toy_data()
    bundle = train_cnn(wave, rr, y, groups, max_epochs=6, patience=3, seed=3)
    proba = predict_proba_cnn(bundle, wave, rr)
    assert proba.shape == (len(y), len(CLASSES)) and np.allclose(proba.sum(axis=1), 1, atol=1e-5)
    wide = y == 2                                              # only the wide beats are separable
    assert (proba.argmax(axis=1)[wide] == 2).mean() > 0.8
    path = tmp_path / "cnn.pt"
    save_cnn(bundle, path)
    again = predict_proba_cnn(load_cnn(path), wave, rr)
    assert np.allclose(proba, again, atol=1e-5)


def test_training_is_reproducible_with_fixed_seed():
    wave, rr, y, groups = toy_data(n=200)
    a = train_cnn(wave, rr, y, groups, max_epochs=3, seed=5)
    b = train_cnn(wave, rr, y, groups, max_epochs=3, seed=5)
    assert np.allclose(predict_proba_cnn(a, wave, rr), predict_proba_cnn(b, wave, rr), atol=1e-6)


def test_torch_flag_is_a_bool():
    assert torch_available() in (True, False)
