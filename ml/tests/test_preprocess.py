import numpy as np

from qalb_ml.config import BEAT_LEN, FS, POST, PRE
from qalb_ml.preprocess import (clean_signal, detect_r_peaks, normalise_beat,
                                preprocess_window, resample, segment_beats)


def test_beat_window_matches_spec():
    assert PRE == 90 and POST == 144 and BEAT_LEN == 234


def test_resample_length():
    x = np.random.default_rng(0).standard_normal(250 * 4)
    y = resample(x, 250, 360)
    assert abs(len(y) - 360 * 4) <= 1


def test_resample_noop():
    x = np.arange(100.0)
    assert resample(x, 360, 360) is not None and len(resample(x, 360, 360)) == 100


def test_clean_removes_baseline(ecg):
    drift = ecg + 5 * np.linspace(0, 1, len(ecg))
    c = clean_signal(drift)
    assert abs(np.median(c)) < 0.2


def test_normalise_beat():
    b = normalise_beat(np.arange(10.0) * 7 + 3)
    assert abs(b.mean()) < 1e-9 and abs(b.std() - 1) < 1e-9
    assert np.all(normalise_beat(np.ones(5)) == 0)


def test_detect_r_peaks_rate(ecg):
    peaks = detect_r_peaks(clean_signal(ecg))
    expected = 20 * 72 / 60
    assert abs(len(peaks) - expected) <= 2


def test_segment_beats_shape_and_edges(ecg):
    clean = clean_signal(ecg)
    peaks = np.array([10, 500, 1000, len(clean) - 10])
    beats, kept = segment_beats(clean, peaks)
    assert beats.shape == (2, BEAT_LEN)
    assert list(kept) == [500, 1000]


def test_segment_beats_empty():
    beats, kept = segment_beats(np.zeros(100), np.array([50]))
    assert beats.shape == (0, BEAT_LEN) and len(kept) == 0


def test_segment_centres_on_peak(ecg):
    clean = clean_signal(ecg)
    peaks = detect_r_peaks(clean)
    beats, kept = segment_beats(clean, peaks)
    assert np.all(np.abs(np.argmax(np.abs(beats), axis=1) - PRE) <= 6)


def test_preprocess_window_on_record(short_record):
    sig, fs, peaks, _ = short_record
    out = preprocess_window(sig, fs)
    assert out["beats"].shape[1] == BEAT_LEN
    assert len(out["kept"]) == len(out["beats"])
    assert abs(len(out["peaks"]) - len(peaks)) <= 3


def test_preprocess_window_other_rate(ecg):
    low = ecg[::2]  # 180 Hz
    out = preprocess_window(low, 180)
    assert abs(len(out["clean"]) - len(ecg)) <= 2
    assert len(out["beats"]) > 10
