# ML: arrhythmia detection

1. `pip install -r requirements.txt`
2. `python download_data.py` downloads MIT-BIH Arrhythmia and BIDMC CHF into `data/raw/` (git-ignored).
3. Notebooks go in `notebooks/`, training code in `src/`, trained models in `models/` (model binaries are git-ignored).

Record accuracy, precision, recall and F1 per class in `results.md`.

## Pipeline notes

### 1. Data loading
Records are read with `wfdb` from `data/raw/mitdb`, lead MLII only. The four
paced records (102, 104, 107, 217) are dropped, leaving 44 records. Beat
annotation symbols are mapped to AAMI classes (N, S, V, F, Q); non-beat
annotations (rhythm changes, noise marks) are ignored.

### 2. Preprocessing
`qalb_ml.preprocess.preprocess_window(signal, fs)` takes a raw ECG window at any
sampling rate and returns the cleaned 360 Hz signal, detected R peaks and
normalised beat windows (90 samples before and 144 after the peak, about
0.25 s and 0.4 s). Steps: polyphase resampling to 360 Hz, two-stage median
baseline removal, 0.5-40 Hz zero-phase band-pass, energy-envelope R-peak
detection, per-beat z-score. Training uses the annotated peaks; the upload
and edge paths use the detector. On records 100, 119, 208, 233, 203 and 105
the detector finds 98-100 % of annotated beats within 20 ms.

### 3. Features
Per beat: previous/next RR, local average RR (last 10 intervals), RR ratios,
heart rate; 12 shape statistics (spread, skew, kurtosis, extremes, QRS width,
QRS energy share); db4 wavelet coefficients; every third raw sample. 174
features in total (`qalb_ml.features`).

### 4. Split
Inter-patient split: DS1 (22 records) trains, DS2 (22 records) tests, no record
appears in both. Beat counts (N, S, V, F, Q):

| set | N | S | V | F | Q |
|-----|---|---|---|---|---|
| DS1 | 45849 | 944 | 3788 | 414 | 8 |
| DS2 | 44240 | 1837 | 3220 | 388 | 7 |

The Q class is almost empty once paced records are removed, so its metrics are
not meaningful and it is excluded from macro averages (see evaluation).

### 7. Rhythm-level alerts
`qalb_ml.alerts` turns beat labels into alerts. Rules:

| alert | rule | severity |
|-------|------|----------|
| `ventricular_run` | 3 or more consecutive V beats | high |
| `ventricular_couplet` | exactly 2 consecutive V beats | medium |
| `frequent_ventricular_beats` | 3 or more V beats and at least 10 % of the window | medium |
| `irregular_rhythm` | RR coefficient of variation above 0.15 and more than 25 % of successive RR changes above 20 % (needs 8 beats) | medium |
| `fast_rate` / `slow_rate` | mean heart rate above 100 or below 50 bpm | low |

Confidence is the mean beat confidence over the run (scaled by run length), or
for irregular rhythm, how far the RR statistics are past their thresholds
(0.5 to 1.0).
