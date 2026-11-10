import numpy as np

from qalb_ml.config import BEAT_LEN, PRE
from qalb_ml.features import window_features
from qalb_ml.features_v2 import (RR_CTX_NAMES, SHAPE_NAMES, build_features_v2,
                                 feature_dim_v2, morphology_shape, rr_context,
                                 wavelet_features, window_features_v2)
from qalb_ml.preprocess import clean_signal, detect_r_peaks
from conftest import synthetic_ecg


def test_rr_context_regular_rhythm():
    f = rr_context(np.arange(12) * 360)
    assert f.shape == (12, len(RR_CTX_NAMES))
    mid = f[6]
    names = {n: i for i, n in enumerate(RR_CTX_NAMES)}
    assert np.allclose(mid[:4], 1.0)
    assert np.isclose(mid[names["ratio_prev1_next1"]], 1.0)
    assert np.isclose(mid[names["rmssd5"]], 0.0) and np.isclose(mid[names["local_hr"]], 60.0)


def test_rr_context_premature_beat():
    names = {n: i for i, n in enumerate(RR_CTX_NAMES)}
    peaks = np.array([0, 360, 720, 1080, 1260, 1800, 2160, 2520, 2880])  # beat 4 is early
    f = rr_context(peaks)
    assert f[4, names["ratio_prev1_mean9"]] < 0.7
    assert f[4, names["compensatory"]] > 0.8
    assert f[4, names["sdnn5"]] > 0.05


def test_rr_context_degenerate_inputs_are_finite():
    for n in (0, 1, 2, 3):
        f = rr_context(np.arange(n) * 300)
        assert f.shape == (n, len(RR_CTX_NAMES)) and np.isfinite(f).all()


def test_wavelet_features_energy_sums_to_one():
    beats = np.random.default_rng(0).standard_normal((3, BEAT_LEN))
    w = wavelet_features(beats)
    assert w.shape[0] == 3 and np.isfinite(w).all()
    # 6 relative energies sit right after cA5 and cD5 (14 + 14)
    assert np.allclose(w[:, 28:34].sum(axis=1), 1.0, atol=1e-6)


def _spike(width):
    b = np.zeros(BEAT_LEN)
    k = np.arange(BEAT_LEN) - PRE
    b[:] = np.exp(-(k / width) ** 2)
    return b


def test_shape_width_grows_with_wider_qrs():
    i = SHAPE_NAMES.index("qrs_width_half")
    narrow, wide = morphology_shape(np.vstack([_spike(3), _spike(9)]))[:, i]
    assert wide > narrow * 2


def test_shape_polarity_and_ratios():
    names = {n: i for i, n in enumerate(SHAPE_NAMES)}
    up = _spike(4)
    f = morphology_shape(np.vstack([up, -up]))
    assert f[0, names["r_amp"]] > 0 > f[1, names["r_amp"]]
    assert np.isfinite(f).all()
    assert morphology_shape(np.empty((0, BEAT_LEN))).shape == (0, len(SHAPE_NAMES))


def test_build_features_v2_shape():
    beats = np.random.default_rng(2).standard_normal((6, BEAT_LEN))
    X = build_features_v2(beats, np.arange(6) * 360 + 100)
    assert X.shape == (6, feature_dim_v2()) and np.isfinite(X).all()
    assert build_features_v2(np.empty((0, BEAT_LEN)), np.array([])).shape == (0, feature_dim_v2())


def test_window_features_v2_extends_v1():
    clean = clean_signal(synthetic_ecg(seconds=20), 360)
    peaks = detect_r_peaks(clean, 360)
    X1, k1 = window_features(clean, peaks)
    X2, k2 = window_features_v2(clean, peaks)
    assert np.array_equal(k1, k2)
    assert X2.shape[0] == X1.shape[0] and X2.shape[1] > X1.shape[1]
    assert np.allclose(X2[:, :X1.shape[1]], X1)
