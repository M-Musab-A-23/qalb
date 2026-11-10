import numpy as np
import pytest

from qalb_ml.config import RAW_DIR


def synthetic_ecg(seconds=20, fs=360, hr=72, noise=0.01, seed=0):
    """A crude but peaky synthetic ECG: narrow R spikes over a slow baseline."""
    rng = np.random.default_rng(seed)
    n = int(seconds * fs)
    t = np.arange(n) / fs
    sig = 0.1 * np.sin(2 * np.pi * 0.3 * t)
    step = int(fs * 60 / hr)
    for p in range(int(0.5 * fs), n - 20, step):
        k = np.arange(-15, 16)
        sig[p - 15:p + 16] += np.exp(-(k / 4.0) ** 2)
        kt = np.arange(-30, 31)
        if p + 90 + 30 < n:
            sig[p + 60:p + 121] += 0.2 * np.exp(-(kt / 18.0) ** 2)
    return sig + noise * rng.standard_normal(n)


@pytest.fixture
def ecg():
    return synthetic_ecg()


@pytest.fixture(scope="session")
def short_record():
    """First 30 s of record 100 (needs raw data)."""
    if not RAW_DIR.exists():
        pytest.skip("raw data not downloaded")
    from qalb_ml.data import load_record
    sig, fs, peaks, labels = load_record("100")
    n = 30 * fs
    keep = peaks < n
    return sig[:n], fs, peaks[keep], labels[keep]


@pytest.fixture(scope="session")
def tiny_model(tmp_path_factory):
    """A small forest trained on a few DS1 records, so predict tests never need train.py."""
    if not RAW_DIR.exists():
        pytest.skip("raw data not downloaded")
    import joblib
    from sklearn.ensemble import RandomForestClassifier
    from qalb_ml.config import CLASSES
    from qalb_ml.dataset import record_dataset
    Xs, ys = zip(*[record_dataset(r)[:2] for r in ["106", "119", "208", "209"]])
    clf = RandomForestClassifier(n_estimators=40, random_state=0, n_jobs=-1)
    clf.fit(np.vstack(Xs), np.concatenate(ys))
    path = tmp_path_factory.mktemp("model") / "tiny.joblib"
    joblib.dump({"model": clf, "name": "tiny_forest", "classes": CLASSES,
                 "n_features": int(Xs[0].shape[1]), "version": "test"}, path)
    return path
