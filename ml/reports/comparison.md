| stage | CV macro-F1 (DS1) | DS2 macro-F1 | S recall | V recall | F recall | S prec | F prec | accuracy |
|---|---|---|---|---|---|---|---|---|
| baseline (v1 features, balanced boosting) | 0.451 +/- 0.110 | 0.483 | 0.185 | 0.965 | 0.034 | 0.15 | 0.00 | 0.835 |
| 1 richer features | 0.458 +/- 0.113 | 0.490 | 0.289 | 0.965 | 0.057 | 0.25 | 0.00 | 0.820 |
| 2 imbalance: oversample to 50% of N | 0.491 +/- 0.116 | 0.519 | 0.165 | 0.966 | 0.046 | 0.34 | 0.01 | 0.899 |
| 3 decision thresholds | 0.491 +/- 0.116 | 0.519 | 0.165 | 0.966 | 0.046 | 0.34 | 0.01 | 0.899 |
| 4 boosting search (default kept) + thresholds | 0.491 +/- 0.116 | 0.519 | 0.165 | 0.966 | 0.046 | 0.34 | 0.01 | 0.899 |
| 5 CNN alone | 0.448 +/- 0.045 | 0.560 | 0.366 | 0.964 | 0.023 | 0.42 | 0.00 | 0.898 |
| 6 ensemble + thresholds | 0.501 +/- 0.116 | 0.555 | 0.256 | 0.968 | 0.039 | 0.41 | 0.01 | 0.924 |
