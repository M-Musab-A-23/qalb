"""Write small demo CSVs from DS2 test-set records into samples/.

    python make_samples.py

* sample_normal_100.csv   one column of samples, mostly normal beats (record 100)
* sample_ventricular_233.csv   time,value columns, a stretch with ventricular beats (record 233)
"""
from __future__ import annotations

import numpy as np

from qalb_ml.config import DS2, ROOT
from qalb_ml.data import load_record

OUT = ROOT / "samples"
SECONDS = 30


def best_window(signal, fs, peaks, labels, want):
    """Start of the window with the most beats of class ``want``."""
    size = SECONDS * fs
    best, best_n = 0, -1
    for start in range(0, len(signal) - size, fs * 5):
        sel = (peaks >= start) & (peaks < start + size)
        n = int(np.sum(labels[sel] == want))
        if n > best_n:
            best, best_n = start, n
    return best


def main() -> None:
    OUT.mkdir(exist_ok=True)
    assert "100" in DS2 and "233" in DS2
    sig, fs, peaks, labels = load_record("100")
    seg = sig[fs * 60:fs * 60 + SECONDS * fs]
    np.savetxt(OUT / "sample_normal_100.csv", seg, fmt="%.4f", header="mlii_mv", comments="")

    sig, fs, peaks, labels = load_record("233")
    start = best_window(sig, fs, peaks, labels, "V")
    seg = sig[start:start + SECONDS * fs]
    t = np.arange(len(seg)) / fs
    np.savetxt(OUT / "sample_ventricular_233.csv", np.column_stack([t, seg]),
               fmt=["%.4f", "%.4f"], delimiter=",", header="time_s,mlii_mv", comments="")
    print("wrote", sorted(p.name for p in OUT.glob("*.csv")))


if __name__ == "__main__":
    main()
