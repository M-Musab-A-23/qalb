import numpy as np
import pytest

from qalb_ml.config import CLASSES, DS1, DS2, RAW_DIR
from qalb_ml.dataset import record_dataset
from qalb_ml.features import feature_dim

pytestmark = pytest.mark.skipif(not RAW_DIR.exists(), reason="raw data not downloaded")


def test_record_dataset_shapes():
    X, y, kept = record_dataset("100")
    assert X.shape == (len(y), feature_dim()) and len(kept) == len(y)
    assert set(np.unique(y)) <= set(range(len(CLASSES)))
    assert np.isfinite(X).all()


def test_split_is_by_patient():
    assert not set(DS1) & set(DS2)
