import numpy as np
import pytest

from conftest import synthetic_ecg
from inputs import InputError, load_ecg, parse_text
from qalb_ml.config import FS, RAW_DIR


def to_csv(x, header=None):
    lines = ([header] if header else []) + [f"{v:.5f}" for v in x]
    return "\n".join(lines)


def test_good_single_column_text():
    ecg = load_ecg(to_csv(synthetic_ecg(20), "mv"), fs=360)
    assert ecg.fs == 360 and abs(len(ecg.signal) - 7200) <= 1
    assert ecg.info["quality"]["score"] > 0.6


def test_good_bytes_with_filename_and_resampling():
    x = synthetic_ecg(20)[::2]  # 180 Hz
    ecg = load_ecg(to_csv(x).encode(), fs=180, filename="ecg.csv")
    assert abs(len(ecg.signal) - 7200) <= 2 and ecg.original_fs == 180


def test_time_value_columns_infer_rate():
    x = synthetic_ecg(20)
    t = np.arange(len(x)) / 360.0
    text = "time,value\n" + "\n".join(f"{a:.5f},{b:.5f}" for a, b in zip(t, x))
    ecg = load_ecg(text, fs=999)  # the parameter is ignored when time is given
    assert abs(ecg.original_fs - 360) < 1


def test_time_in_milliseconds():
    sig, fs, info = parse_text("\n".join(f"{i * 4.0},{np.sin(i / 5):.3f}" for i in range(2000)))
    assert abs(fs - 250) < 1


def test_semicolon_and_tab_delimiters():
    a = parse_text("1;2\n3;4\n5;6")
    b = parse_text("1\t2\n3\t4\n5\t6")
    assert a[0].tolist() == b[0].tolist() == [2, 4, 6]


def test_too_short():
    with pytest.raises(InputError, match="too short"):
        load_ecg(to_csv(synthetic_ecg(2)), fs=360)


def test_flat_line():
    with pytest.raises(InputError, match="flat"):
        load_ecg(to_csv(np.full(3600, 0.5)), fs=360)


def test_noisy():
    noise = np.random.default_rng(1).standard_normal(3600)
    with pytest.raises(InputError, match="noisy"):
        load_ecg(to_csv(noise), fs=360)


def test_noisy_ecg_is_rejected():
    x = synthetic_ecg(20) + np.random.default_rng(2).standard_normal(7200)
    with pytest.raises(InputError, match="noisy"):
        load_ecg(to_csv(x), fs=360)


def test_unsupported_extension_and_binary():
    with pytest.raises(InputError, match="Unsupported"):
        load_ecg(b"abc", filename="ecg.xlsx")
    with pytest.raises(InputError):
        load_ecg(bytes(range(256)) * 20, filename="ecg.csv")


def test_no_numbers_and_ragged_rows():
    with pytest.raises(InputError, match="numeric"):
        load_ecg("hello\nworld", fs=360)
    with pytest.raises(InputError, match="columns"):
        load_ecg("1,2\n3\n4,5", fs=360)


def test_bad_sampling_rate():
    with pytest.raises(InputError, match="Sampling rate"):
        load_ecg(to_csv(synthetic_ecg(20)), fs=10)
    with pytest.raises(InputError):
        load_ecg(to_csv(synthetic_ecg(20)), fs=-1)


@pytest.mark.skipif(not RAW_DIR.exists(), reason="raw data not downloaded")
def test_wfdb_record():
    ecg = load_ecg(str(RAW_DIR / "100"), check_quality=False)
    assert ecg.fs == FS and ecg.info["layout"] == "wfdb" and ecg.info["channel"] == "MLII"
