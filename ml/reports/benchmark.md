# Inference benchmark

Machine: Intel64 Family 6 Model 140 Stepping 1, GenuineIntel, Windows 10, Python 3.13.3, one process, CPU only. Latency is the median (and 95th percentile) of 10 runs after a warm-up call, on MIT-BIH record 100. Run `python benchmark.py` to reproduce on your machine.

| measurement | boosting_cnn_ensemble | gradient_boosting |
|---|---|---|
| first analysis after start (loads model, torch, CNN) | 2370 ms | 168 ms |
| per beat (10 s window divided by beats) | 3.20 ms | 2.83 ms |
| per 10 s window, median / p95 | 35 / 36 ms | 31 / 36 ms |
| per uploaded 30 s file, median / p95 | 71 / 75 ms | 72 / 82 ms |
| peak memory of a fresh process (resident) | 339 MB | 172 MB |

The second column, when present, is the torch-missing fallback (boosting model only), forced by disabling torch detection.

| model file | size |
|---|---|
| qalb_beat_classifier.joblib | 1.15 MB |
| qalb_beat_cnn.pt | 0.13 MB |
| total | 1.28 MB |
