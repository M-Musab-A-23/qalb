# ML: arrhythmia detection

1. `pip install -r requirements.txt`
2. `python download_data.py` downloads MIT-BIH Arrhythmia and BIDMC CHF into `data/raw/` (git-ignored).
3. Library code is in `qalb_ml/`, notebooks in `notebooks/`, figures and `metrics.json` in `reports/`, trained models in `models/` (model binaries are git-ignored).
4. `python train.py` reproduces the whole pipeline; results are summarised below.

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

### 5. Models
All models use the same 174 features. Imbalance is handled with class weights
(logistic regression, random forest, gradient boosting via balanced sample
weights) or minority oversampling (neural net). The neural comparison is a
small scikit-learn MLP (128-64) on the feature vector, not a 1D CNN: no deep
learning framework is part of this project's requirements.

Model choice used patient-grouped 4-fold cross-validation on DS1 only (mean
macro-F1 over N, S, V, F):

| model | CV macro-F1 |
|-------|-------------|
| logistic regression | 0.421 +/- 0.090 |
| random forest | 0.441 +/- 0.072 |
| gradient boosting | **0.451 +/- 0.110** |
| MLP | 0.414 +/- 0.052 |

Gradient boosting was selected and is the packaged model. DS2 played no part
in the choice or in any setting.

### 6. Evaluation on DS2 (held-out patients)
Scored once. Per-class precision / recall / F1:

| model | N | S | V | F |
|-------|---|---|---|---|
| logistic regression | .98 / .80 / .88 | .31 / .56 / .40 | .75 / .90 / .82 | .03 / .42 / .05 |
| random forest | .95 / .99 / .97 | .80 / .02 / .05 | .89 / .91 / .90 | .00 / .00 / .00 |
| **gradient boosting** | .96 / .86 / .91 | .15 / .19 / .16 | .77 / .97 / .86 | .00 / .03 / .01 |
| MLP | .97 / .86 / .91 | .12 / .11 / .11 | .46 / .91 / .61 | .01 / .03 / .01 |

| model | accuracy | macro-F1 (N,S,V,F) | V sensitivity | S sensitivity |
|-------|----------|--------------------|---------------|---------------|
| logistic regression | 0.794 | 0.536 | 0.898 | 0.563 |
| random forest | 0.943 | 0.479 | 0.905 | 0.024 |
| **gradient boosting** | 0.835 | 0.483 | 0.965 | 0.185 |
| MLP | 0.826 | 0.410 | 0.909 | 0.106 |

Honest reading:

* Ventricular beats are found reliably (gradient boosting: 96.5 % sensitivity,
  77 % precision). This is what the "ventricular pattern" alerts rely on.
* Supraventricular beats are hard across patients. The selected model finds
  18.5 % of them; the plain logistic regression actually does better on S
  (56 % sensitivity) and has the best DS2 macro-F1, but it was not picked
  because cross-validation on DS1 preferred gradient boosting and the test set
  must not drive the choice.
* Fusion beats are essentially not recognised (F1 near 0). They are rare,
  look like a mix of N and V, and DS1 holds only 414 of them.
* The Q class has 8 training and 7 test beats and is excluded from the macro
  average (including it, gradient boosting macro-F1 over 5 classes is lower).
* Accuracy is dominated by N and is not a useful headline number here.

Figures are in `reports/`: `confusion_best.png`, `confusion_best_normalised.png`,
`f1_by_class.png`, `sensitivity_v_s.png`, `class_distribution.png` and one
confusion matrix per model. Full numbers are in `reports/metrics.json`. The
notebook `notebooks/arrhythmia_results.ipynb` walks through all of it.

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

### 8. Packaging
`models/qalb_beat_classifier.joblib` (0.4 MB, committed) holds the selected
model. `predict.py` exposes `predict_beats`, `predict_window` and a streaming
demo. Regenerate the model with `python train.py`.

## Using the classifier

Everything below runs from the `ml/` folder with the virtual environment active.

### Train
```
python download_data.py      # once, fills data/raw (git-ignored)
python train.py              # features, grouped CV on DS1, DS2 report, saves the model
python train.py --quick      # smaller models, smoke test
```
`train.py` writes `models/qalb_beat_classifier.joblib`, `reports/metrics.json`
and the figures in `reports/`. Beat features are cached in `.cache/`. The
model file is git-ignored; regenerate it with the command above.

### Python API
```python
from predict import predict_beats, predict_window
beats = predict_beats(signal, fs=360)     # [{"sample", "time_s", "class", "confidence"}]
result = predict_window(signal, fs=360)   # full result, see schema below
```
`signal` is a 1-D array of raw ECG samples at any sampling rate between 50 and
5000 Hz. `analyse_recording(signal, fs)` does the same for long recordings by
splitting them into 60 s windows and merging the output.

### Demo
```
python predict.py --record 100 --seconds 60            # stream a MIT-BIH record
python predict.py --file samples/sample_ventricular_233.csv --fs 360   # JSON for a file
```

### Result schema
Every analysis path returns this JSON-serialisable object
(`qalb_ml/schema.py`):
```json
{
  "schema_version": "1.0",
  "model": {"name": "random_forest", "version": "1.0"},
  "sampling_rate_in": 360.0,
  "sampling_rate_model": 360.0,
  "duration_s": 30.0,
  "beats": [{"sample": 215, "time_s": 0.597, "class": "N", "confidence": 0.98}],
  "rhythm": {"n_beats": 38, "class_counts": {"N": 36, "S": 0, "V": 2, "F": 0, "Q": 0},
             "mean_hr_bpm": 76.1, "rr_mean_s": 0.788, "rr_cv": 0.09,
             "rr_jump_fraction": 0.11, "rhythm": "regular"},
  "alerts": [{"type": "ventricular_couplet", "severity": "medium", "confidence": 0.71,
              "start_sample": 4200, "end_sample": 4690,
              "message": "Ventricular pattern: two consecutive ventricular beats"}],
  "quality": {"score": 0.82, "flatline_fraction": 0.0, "noise_ratio": 0.01,
              "beat_agreement": 0.93, "rate_plausibility": 1.0},
  "warnings": [],
  "disclaimer": "QALB is a research and monitoring prototype. It is not a medical device ..."
}
```
`sample` and alert positions index into the signal that was passed in (its own
sampling rate). `rhythm` is `regular`, `irregular` or `insufficient data`.
Quality is 0 to 1 (see `qalb_ml/quality.py`); below 0.35 a warning is added.

### Upload inputs (`inputs.py`)
`load_ecg(source, fs=360)` accepts:

* CSV, TSV or text with one column of samples (header optional, `fs` is used)
* CSV, TSV or text with time and value columns (seconds or milliseconds; the
  rate is read from the time column and `fs` is ignored)
* a WFDB record (`.hea` + `.dat`; MLII if present, else the first channel)

The signal is resampled to 360 Hz. It raises `InputError` with a readable
message for: unsupported file type, non-numeric or ragged content, sampling
rate outside 50-5000 Hz, recording shorter than 5 s or longer than 60 min,
flat line, or quality below 0.35 ("too noisy").

### HTTP service
```
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```
* `GET /health` returns `{"status": "ok", "model_loaded": true, "model": {...}, "disclaimer": "..."}`
* `POST /analyze` is a multipart form with `file` (CSV/TXT, or the `.dat` of a
  WFDB record plus its `.hea` as `header`) and `fs` (Hz, default 360). It
  returns the result schema above plus an `input` block. Bad input gives HTTP
  422 with `{"detail": "<reason>"}`; files over 25 MB give 413; a missing model
  gives 503.

```
curl -F "file=@samples/sample_ventricular_233.csv" -F "fs=360" http://localhost:8000/analyze
```
`samples/` holds two 30 s demo CSVs cut from DS2 records 100 (one column) and
233 (time,value). Recreate them with `python make_samples.py`.

### Tests
```
pytest
```
Tests that need MIT-BIH data skip themselves when `data/raw` is missing.
`tests/conftest.py` trains a tiny model on four records, so tests do not need
`train.py` to have run.

> QALB is a research and monitoring prototype. It is not a medical device and
> must not be used for diagnosis or treatment decisions.
