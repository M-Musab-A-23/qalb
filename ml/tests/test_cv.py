import numpy as np

from qalb_ml.cv import fold_macro_f1, full_proba, grouped_folds, oof_proba, summarise


def test_folds_keep_patients_apart_and_cover_everything():
    groups = np.repeat([f"p{i}" for i in range(12)], 10)
    folds = grouped_folds(groups)
    seen = np.concatenate([va for _, va in folds])
    assert sorted(seen) == list(range(len(groups)))
    for tr, va in folds:
        assert not set(groups[tr]) & set(groups[va])


def test_full_proba_pads_missing_classes():
    class Fake:
        classes_ = np.array([0, 2])

        def predict_proba(self, X):
            return np.tile([0.3, 0.7], (len(X), 1))

    out = full_proba(Fake(), np.zeros((3, 1)))
    assert out.shape == (3, 5) and np.allclose(out[:, 2], 0.7) and (out[:, 1] == 0).all()


def test_oof_uses_only_training_rows_for_each_fold():
    groups = np.repeat(np.arange(8), 5)
    y = np.arange(40) % 4
    X = np.arange(40, dtype=float)[:, None]
    folds = grouped_folds(groups)
    seen = []

    def fp(Xtr, ytr, Xva, tr):
        seen.append((set(tr.tolist()), set(np.flatnonzero(np.isin(X[:, 0], Xva[:, 0])).tolist())))
        return np.full((len(Xva), 5), 0.2)

    out = oof_proba(fp, X, y, folds)
    assert out.shape == (40, 5)
    assert all(not tr & va for tr, va in seen)


def test_summarise_perfect_predictions():
    groups = np.repeat(np.arange(8), 25)
    y = np.tile([0, 0, 0, 1, 2, 3, 0, 0], 25)
    proba = np.eye(5)[y]
    r = summarise(y, proba, grouped_folds(groups))
    assert np.isclose(r["macro_f1_mean"], 1.0) and r["s_recall"] == 1.0
    assert len(fold_macro_f1(y, y, grouped_folds(groups))) == 4
