import pytest

from qalb_ml.config import DS1, DS2, PACED_RECORDS, RAW_DIR
from qalb_ml.data import list_records, load_record

pytestmark = pytest.mark.skipif(not RAW_DIR.exists(), reason="raw data not downloaded")


def test_paced_records_are_dropped():
    names = list_records()
    for p in PACED_RECORDS:
        assert p not in names
    assert len(names) == 44


def test_splits_cover_usable_records():
    assert set(DS1) | set(DS2) == set(list_records())
    assert not set(DS1) & set(DS2)


def test_load_record_shapes():
    sig, fs, peaks, labels = load_record("100")
    assert fs == 360
    assert len(peaks) == len(labels) > 2000
    assert peaks.max() < len(sig)
