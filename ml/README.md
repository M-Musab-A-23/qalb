# ML: arrhythmia detection

1. `pip install -r requirements.txt` (add `pip install -r requirements-torch.txt` to train or run the optional CNN)
2. `python download_data.py` downloads MIT-BIH Arrhythmia and BIDMC CHF into `data/raw/` (git-ignored).
3. Library code is in `qalb_ml/`, notebooks in `notebooks/`, figures and `metrics.json` in `reports/`, trained models in `models/` (the two final model files, 1.3 MB together, are committed).
4. `python train.py` reproduces the baseline pipeline, `python train.py --improved` the whole improved one; results are summarised below.

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
The baseline above is version 1.0. The packaged model is version 2.0 (see
"Improving the classifier"): `models/qalb_beat_classifier.joblib` (1.15 MB,
boosting model, feature set and decision scales) plus `models/qalb_beat_cnn.pt`
(0.13 MB, CNN weights). `predict.py` exposes `predict_beats`, `predict_window`
and a streaming demo; the result schema did not change. Regenerate the model
files with `python train.py --improved` (a few hours on a CPU, mostly the boosting searches).

## Using the classifier

Everything below runs from the `ml/` folder with the virtual environment active.

### Train
```
python download_data.py      # once, fills data/raw (git-ignored)
python train.py              # baseline: features, grouped CV on DS1, DS2 report (reports/metrics.json)
python train.py --quick      # smaller models, smoke test
python train.py --improved   # every DS1 experiment, the one DS2 run, and the packaged model
```
The baseline run writes `reports/metrics.json` and `models/qalb_beat_baseline.joblib`
(git-ignored) and no longer touches the packaged model. `--improved` runs
`experiments/step1_features.py` to `step6_ensemble.py` in order, then
`final_eval.py` (scores DS2 once and writes `models/qalb_beat_classifier.joblib`
and `models/qalb_beat_cnn.pt`) and `report_final.py`. Beat features are cached
in `.cache/`. `python final_eval.py --dry-run` rehearses the final script on a
held-out slice of DS1 and never loads DS2. `python benchmark.py` writes
`reports/benchmark.md`.

The CNN is optional at inference. If torch is not installed, or the CNN file is
missing, `predict.py` logs `torch is not installed: using the gradient boosting
model alone` once and uses the boosting model with the same output schema; the
reported model name then is `gradient_boosting` instead of `boosting_cnn_ensemble`.

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
  "model": {"name": "boosting_cnn_ensemble", "version": "2.0"},
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

## Improving the classifier

The sections above describe the baseline (version 1.0: 174 features, balanced
gradient boosting). The work below was done step by step on a branch. Every
choice (features, weighting, thresholds, parameters, ensemble weight) was made
with patient-grouped 4-fold cross-validation on DS1 only; DS2 was scored once
at the end (`final_eval.py`). The experiment scripts are in `experiments/` and
their numbers in `reports/experiments/`. Cross-validation numbers are the mean
and standard deviation of macro-F1 over N, S, V and F on the four folds; the
recalls are pooled over all out-of-fold beats.

### Step 1: richer features
Feature set v2 keeps the 174 baseline features and adds 81 (`qalb_ml/features_v2.py`):

* RR context (19): the two intervals before and after the beat, their ratios,
  differences, a local RMSSD / SDNN / pNN50, a compensatory-pause ratio and a
  local heart rate.
* Wavelet bands (41): level-5 db4 approximation and detail coefficients,
  relative energy and peak of every band, wavelet entropy.
* Shape ratios (21): Q, S, P and T amplitude relative to the R peak, QRS width
  at half height, QRS duration from the slope, up/down slopes, positive and
  negative area, number of local extrema in the QRS and the ST level.

Every function takes plain arrays (R-peak positions or normalised beats), so
`window_features_v2(clean, peaks)` works on any raw window after cleaning.

Cross-validation on DS1, same boosting model for every row:

| features | n | CV macro-F1 | S recall | V recall | F recall |
|----------|---|-------------|----------|----------|----------|
| v1 (baseline) | 174 | 0.451 +/- 0.110 | 0.321 | 0.913 | 0.002 |
| v1 + RR context | 193 | 0.445 +/- 0.112 | 0.268 | 0.911 | 0.002 |
| v1 + wavelet bands | 215 | 0.452 +/- 0.108 | 0.289 | 0.900 | 0.005 |
| v1 + shape ratios | 195 | 0.461 +/- 0.118 | 0.344 | 0.900 | 0.002 |
| **v2 (all)** | 255 | 0.458 +/- 0.113 | 0.261 | 0.868 | 0.002 |

The gain is small (+0.007) and well inside the fold-to-fold spread, so the
features alone do not fix the weak classes. v2 was kept because it scored
higher than v1 in cross-validation and the later steps (CNN, ensemble) use the
same RR context.

### Step 2: class imbalance
Same v2 features and boosting model, only the handling of imbalance changes.
Oversampling repeats rare-class rows (S, V, F, Q) at random up to a share of
the N count, and it runs inside each training fold after the split; the
validation fold is never touched. Focal-style weighting multiplies the balanced
class weights by `(1 - p)^gamma`, where `p` is the probability a first-stage
model (cross-fitted by patient inside the training fold) gave the true class.

| strategy | CV macro-F1 | S recall | V recall | F recall |
|----------|-------------|----------|----------|----------|
| no weighting | 0.462 +/- 0.095 | 0.153 | 0.853 | 0.000 |
| balanced weights (baseline) | 0.458 +/- 0.113 | 0.261 | 0.868 | 0.002 |
| square-root weights | 0.455 +/- 0.101 | 0.181 | 0.833 | 0.000 |
| oversample to 25 % of N | 0.480 +/- 0.101 | 0.257 | 0.853 | 0.000 |
| **oversample to 50 % of N** | 0.491 +/- 0.116 | 0.305 | 0.868 | 0.002 |
| focal, gamma 1 | 0.444 +/- 0.093 | 0.269 | 0.811 | 0.002 |
| focal, gamma 2 | 0.433 +/- 0.107 | 0.303 | 0.798 | 0.007 |

Oversampling to half of the N count was best (+0.033 over balanced weights).
Focal weighting made things worse: the first-stage model is almost certain
about the training rows it can memorise, so the weights end up favouring noisy
and mislabelled beats. F recall stays near zero for every strategy: with 414
training beats from few patients, nothing here makes it learnable.

### Step 3: decision thresholds
`qalb_ml/thresholds.py` multiplies each class probability by a scale before
the argmax and fits the scales for S, V and F by coordinate ascent on
macro-F1. To estimate how well this works on unseen patients the scales are
fitted on three folds' out-of-fold probabilities and applied to the fourth
(nested). A second variant adds a precision floor of 0.2 for S and F.

| decision rule | CV macro-F1 | S recall (precision) | F recall (precision) |
|---------------|-------------|----------------------|----------------------|
| **argmax (scale 1)** | 0.491 +/- 0.116 | 0.305 (0.27) | 0.002 (0.01) |
| tuned scales | 0.480 +/- 0.110 | 0.242 (0.27) | 0.007 (0.00) |
| tuned, precision floor 0.2 | 0.491 +/- 0.116 | 0.305 (0.27) | 0.002 (0.01) |

Tuned thresholds did not help on held-out patients: the scales that look best
on all of DS1 do not transfer to the next fold, and with the precision floor no
scale beats scale 1. The rule was to use thresholds only if they beat argmax by
at least 0.005 in nested cross-validation, so none are applied here.
`reports/threshold_tradeoff.png` shows what moving the S or F scale does to
precision and recall on DS1 out-of-fold beats: raising S recall from 0.31 to
0.45 costs precision falling from 0.27 to 0.10, and F has no usable operating
point at all.

### Step 4: tuned gradient boosting
A bounded random search: 10 configurations drawn once with a fixed seed from
learning rate, leaf count, minimum leaf size, L2 penalty, iteration count and
the share of features per split (`experiments/step4_tuning.py`), each scored
with the same 4-fold grouped CV and the step-2 oversampling.

| | CV macro-F1 |
|---|---|
| default parameters (step 2) | 0.491 +/- 0.116 |
| best of 10 (lr 0.05, 16 leaves, min leaf 200, L2 1, 250 iterations, 30 % of features) | 0.492 +/- 0.117 |
| range over the 10 | 0.473 to 0.492 |

Tuning did not help: the best configuration is 0.001 better, far inside the
spread between folds. A tuned model had to beat the default by at least 0.005
to be adopted, so the default parameters are kept (the `boosting_tuned_*` keys
in `reports/experiments/step6_ensemble.json` therefore describe the default
model).

### Step 5: 1D CNN
`qalb_ml/cnn.py`: three conv blocks (16, 32, 64 channels, kernel 7, batch norm,
max pooling) over the 234-sample normalised beat (0.25 s before and 0.4 s after
the R peak), global mean and max pooling, concatenated with a small branch for
the 26 RR features, then a 64-unit hidden layer. About 30 thousand parameters.
Loss is cross-entropy with square-root class weights, AdamW, light amplitude
and noise augmentation, seed 42. Whole patients (about 20 %) are held out of
each training fold for early stopping on the weighted loss, so stopping never
sees the validation patients of the cross-validation. One fit takes about one
minute on a CPU.

| model | CV macro-F1 | S recall | V recall | F recall |
|-------|-------------|----------|----------|----------|
| boosting (step 2) | 0.491 +/- 0.116 | 0.305 | 0.868 | 0.002 |
| CNN | 0.448 +/- 0.045 | 0.352 | 0.841 | 0.000 |

On its own the CNN is not better than boosting on macro-F1. Its validation loss
bottoms out after 1 to 8 epochs, a sign of how quickly it fits the training
patients' individual beat shapes. It finds more S beats (35 %) but with low
precision (0.11).

### Step 6: ensemble
The two models' out-of-fold probabilities are averaged with a weight chosen on
a grid by DS1 cross-validated macro-F1 (`qalb_ml/ensemble.py`). A 50/50 blend
scored best:

| weight on boosting | 0.0 | 0.3 | 0.5 | 0.7 | 1.0 |
|--------------------|-----|-----|-----|-----|-----|
| CV macro-F1 | 0.448 | 0.468 | **0.501** | 0.497 | 0.491 |

| model | CV macro-F1 | S recall (precision) | V recall (precision) | F recall |
|-------|-------------|----------------------|----------------------|----------|
| boosting | 0.491 +/- 0.116 | 0.305 (0.27) | 0.868 (0.55) | 0.002 |
| CNN | 0.448 +/- 0.045 | 0.352 (0.11) | 0.841 (0.62) | 0.000 |
| **ensemble** | 0.501 +/- 0.116 | 0.336 (0.32) | 0.899 (0.55) | 0.002 |

Thresholds were tested again on the ensemble probabilities with the same
nested-CV rule and again did not beat argmax, so the ensemble uses plain argmax.
(For the CNN alone thresholds did pass the rule, with F recall 0.15 at 0.02
precision and a lower S recall, but the CNN alone is not the selected stage.)
The ensemble had the best cross-validated macro-F1 of all end-of-pipeline
candidates and is the final configuration. That choice is written to
`reports/experiments/selection.json` before any DS2 number exists.

### Final results on DS2 (scored once)
`final_eval.py` fitted every stage on all of DS1 and scored the 22 DS2 patients
once. The first row is the unchanged version 1.0 model (its numbers match
`reports/metrics.json`). Stage 3 changes nothing because no thresholds were
adopted, and stage 4 changes nothing because tuning was not adopted, so those
rows repeat stage 2. Full table with precision: `reports/comparison.md`,
all numbers: `reports/final_metrics.json`.

| stage | CV macro-F1 (DS1) | DS2 macro-F1 | S recall | V recall | F recall | accuracy |
|-------|-------------------|--------------|----------|----------|----------|----------|
| baseline (v1 features, balanced boosting) | 0.451 | 0.483 | 0.185 | 0.965 | 0.034 | 0.835 |
| 1 richer features (v2) | 0.458 | 0.490 | 0.289 | 0.965 | 0.057 | 0.820 |
| 2 + oversampling to 50 % of N | 0.491 | 0.519 | 0.165 | 0.966 | 0.046 | 0.899 |
| 3 + decision thresholds | 0.491 | 0.519 | 0.165 | 0.966 | 0.046 | 0.899 |
| 4 + tuned boosting | 0.491 | 0.519 | 0.165 | 0.966 | 0.046 | 0.899 |
| 5 CNN alone | 0.448 | 0.560 | 0.366 | 0.964 | 0.023 | 0.898 |
| **6 ensemble (final)** | 0.501 | 0.555 | 0.256 | 0.968 | 0.039 | 0.924 |

Per class for the final ensemble against the baseline (precision / recall / F1):

| model | N | S | V | F |
|-------|---|---|---|---|
| baseline | .96 / .86 / .91 | .15 / .19 / .16 | .77 / .97 / .86 | .00 / .03 / .01 |
| **final ensemble** | .96 / .96 / .96 | .41 / .26 / .32 | .89 / .97 / .93 | .01 / .04 / .02 |

Figures: `reports/comparison_stages.png` (macro-F1 and rare-class recall per
stage), `reports/f1_by_class_final.png`, `reports/sensitivity_final.png`,
`reports/confusion_final.png`, `reports/confusion_final_normalised.png`,
`reports/threshold_tradeoff.png`.

Honest reading:

* The final model is better than the baseline on macro-F1 (0.555 against
  0.483), on S precision (0.41 against 0.15, because there are far fewer false
  alarms from normal beats) and on V precision (0.89 against 0.77), with V
  sensitivity unchanged at about 0.97. Normal beats are called normal 95.6 % of
  the time (baseline 86 %).
* S sensitivity went up only modestly, from 0.185 to 0.256. About three in four
  supraventricular beats are still missed. The best S recall of any stage on
  DS2 (0.366) belongs to the CNN alone, at 0.42 precision.
* Fusion beats are still not recognised: F recall 0.04 at 1 % precision. The
  extra features, weighting and CNN do not change that; the confusion matrix
  shows they are mostly called N.
* Things that did not help: tuned thresholds and tuned boosting parameters
  (no gain on held-out DS1 patients), focal weighting (worse), RR-context
  features on their own (slightly worse). The richer features were a small
  gain on DS1 (+0.007) that sits inside the fold-to-fold spread.
* The choice of final stage was made on DS1 cross-validation (ensemble 0.501,
  boosting 0.491, CNN 0.448). On DS2 the CNN alone scored 0.560 against 0.555
  for the ensemble; that difference is small and was not used to change the
  choice. Including the almost-empty Q class, macro-F1 over five classes is
  0.444 (baseline 0.387).
* Cross-validation macro-F1 on DS1 has a standard deviation of 0.11 across four
  folds, so differences below about 0.02 between stages should not be read as
  real. The DS2 results come from one set of 22 patients.

### Method summary
Beats are cut around annotated R peaks (training) or detected ones (inference),
band-pass filtered and z-scored. Boosting sees 255 hand-built features
(RR context, wavelets, shape ratios, 12 shape statistics, raw samples) with the
rare classes oversampled to half the N count inside each training fold. The CNN
sees the 234-sample waveform plus 26 RR features. The final probabilities are
the average of the two with equal weight; the class with the highest averaged
probability is reported and its probability is the confidence. Each of the
choices above came from patient-grouped cross-validation on DS1.

### Speed
Measured by `benchmark.py` on the development machine (Intel Core, Windows,
CPU only, one process); the full tables are in `reports/benchmark.md`.

| measurement | final ensemble | boosting only (no torch) |
|-------------|----------------|--------------------------|
| per beat | 3.2 ms | 2.8 ms |
| per 10 s window (median) | 35 ms | 31 ms |
| per uploaded 30 s file (median) | 71 ms | 72 ms |
| first analysis after start | 2.4 s (loads torch) | 0.17 s |
| resident memory, fresh process | 339 MB | 172 MB |
| model files | 1.28 MB (1.15 + 0.13) | 1.15 MB |

Importing torch dominates start-up time and memory; once loaded, the CNN adds
only a few milliseconds per window.
