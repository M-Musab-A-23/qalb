from qalb_ml.labels import AAMI_MAP, symbol_to_aami


def test_known_symbols():
    assert symbol_to_aami("N") == "N"
    assert symbol_to_aami("L") == "N"
    assert symbol_to_aami("A") == "S"
    assert symbol_to_aami("V") == "V"
    assert symbol_to_aami("F") == "F"
    assert symbol_to_aami("/") == "Q"


def test_non_beat_symbols_are_dropped():
    for sym in ["+", "~", "|", "!", "x"]:
        assert symbol_to_aami(sym) is None


def test_only_five_classes():
    assert set(AAMI_MAP.values()) == {"N", "S", "V", "F", "Q"}
