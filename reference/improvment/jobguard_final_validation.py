"""
JobGuard AI - Final Controlled Validation
A) EMSCAD: fair comparison on the SAME held-out 70:30 test set.
   - Baseline: word TF-IDF (1,2) + ordinary Logistic Regression, threshold 0.50
   - Balanced model: same vectorizer + class_weight='balanced'
   - Threshold is selected from a validation subset of the training data only.
   - Final candidate is retrained on the full 70% training set; test set is not used for tuning.
   - Also compares word 1-3 balanced and character 3-5 balanced candidates.

B) PhiUSIIL:
   - Verifies label counts (assumes source 0=phishing, 1=legitimate; confirm official documentation).
   - Reports duplicate engineered feature rows and conflicting labels.
   - Evaluates standard stratified random split and a group split that prevents identical 18-feature
     vectors from appearing in both train and test. The grouped result is a robustness check,
     not a replacement for testing on independent/new URLs.

Place this script beside the two CSV datasets, or enter their paths when prompted.
Run: python jobguard_final_validation.py
Install: python -m pip install pandas numpy scikit-learn

Outputs: JobGuard_Final_Validation/
"""
from pathlib import Path
import warnings
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix
)

warnings.filterwarnings("ignore")
BASE = Path(__file__).resolve().parent
OUT = BASE / "JobGuard_Final_Validation"
OUT.mkdir(exist_ok=True)
SEED = 42
TEXT_COLS = ["title", "company_profile", "description", "requirements", "benefits"]
URL_FEATURES = [
    "URLLength", "DomainLength", "IsDomainIP", "TLDLength",
    "NoOfSubDomain", "HasObfuscation", "NoOfObfuscatedChar",
    "ObfuscationRatio", "NoOfLettersInURL", "LetterRatioInURL",
    "NoOfDegitsInURL", "DegitRatioInURL", "NoOfEqualsInURL",
    "NoOfQMarkInURL", "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL", "SpacialCharRatioInURL", "IsHTTPS"
]

def locate(candidates, required):
    for name in candidates:
        path = BASE / name
        if path.exists():
            cols = pd.read_csv(path, nrows=0).columns
            if all(c in cols for c in required):
                print(f"Found {name}")
                return path
    path = Path(input(f"Enter full path to {candidates[0]}: ").strip().strip('"'))
    if not path.exists():
        raise FileNotFoundError(path)
    cols = pd.read_csv(path, nrows=0).columns
    missing = [c for c in required if c not in cols]
    if missing:
        raise ValueError(f"Missing required columns in {path.name}: {missing}")
    return path

def score_row(y_true, prob, threshold, dataset, model_name, split_name):
    pred = (prob >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    return {
        "Dataset": dataset, "Model": model_name, "Evaluation": split_name,
        "Threshold": round(float(threshold), 4),
        "Accuracy": accuracy_score(y_true, pred),
        "Precision": precision_score(y_true, pred, zero_division=0),
        "Recall": recall_score(y_true, pred, zero_division=0),
        "F1-score": f1_score(y_true, pred, zero_division=0),
        "ROC-AUC": roc_auc_score(y_true, prob),
        "TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)
    }

def best_f1_threshold(y, probs):
    # Optimize threshold on validation data only. Tie-break by precision, then threshold.
    candidates = np.arange(0.10, 0.91, 0.01)
    best = None
    for t in candidates:
        pred = (probs >= t).astype(int)
        item = (f1_score(y, pred, zero_division=0),
                precision_score(y, pred, zero_division=0), float(t))
        if best is None or item > best:
            best = item
    return best[2]

def run_emscad(path):
    print("\n=== EMSCAD controlled comparison ===")
    df = pd.read_csv(path)
    for c in TEXT_COLS:
        df[c] = df[c].fillna("").astype(str)
    labels = pd.to_numeric(df["fraudulent"], errors="coerce")
    valid = labels.isin([0, 1])
    df = df.loc[valid].copy().reset_index(drop=True)
    y = labels.loc[valid].astype(int).reset_index(drop=True)
    if y.nunique() != 2:
        raise ValueError("EMSCAD must have fraudulent=1 and legitimate=0.")
    text = df[TEXT_COLS].agg(" ".join, axis=1)

    # Same test set across all candidates.
    x_train, x_test, y_train, y_test = train_test_split(
        text, y, test_size=.30, random_state=SEED, stratify=y
    )
    # A validation subset from training data is used only to select threshold.
    x_fit, x_val, y_fit, y_val = train_test_split(
        x_train, y_train, test_size=.20, random_state=SEED, stratify=y_train
    )
    candidates = [
        ("Baseline word TF-IDF (1-2), unweighted", "word", (1, 2), None, 20000),
        ("Word TF-IDF (1-2), balanced", "word", (1, 2), "balanced", 20000),
        ("Word TF-IDF (1-3), balanced", "word", (1, 3), "balanced", 25000),
        ("Character TF-IDF (3-5), balanced", "char", (3, 5), "balanced", 30000),
    ]
    rows = []
    for name, analyzer, ngrams, class_weight, max_features in candidates:
        print("Testing:", name)
        vec_args = dict(analyzer=analyzer, ngram_range=ngrams, min_df=2,
                        max_features=max_features, sublinear_tf=True)
        if analyzer == "word":
            vec_args["stop_words"] = "english"
        # Threshold tuning uses only training-derived validation data.
        vec_tune = TfidfVectorizer(**vec_args)
        X_fit = vec_tune.fit_transform(x_fit)
        X_val = vec_tune.transform(x_val)
        tune_model = LogisticRegression(max_iter=2000, class_weight=class_weight,
                                        random_state=SEED, solver="liblinear")
        tune_model.fit(X_fit, y_fit)
        val_prob = tune_model.predict_proba(X_val)[:, list(tune_model.classes_).index(1)]
        threshold = best_f1_threshold(y_val.to_numpy(), val_prob)

        # Refit on the FULL 70% training set, then evaluate the same untouched test set.
        vec = TfidfVectorizer(**vec_args)
        X_train = vec.fit_transform(x_train)
        X_test = vec.transform(x_test)
        model = LogisticRegression(max_iter=2000, class_weight=class_weight,
                                   random_state=SEED, solver="liblinear")
        model.fit(X_train, y_train)
        test_prob = model.predict_proba(X_test)[:, list(model.classes_).index(1)]
        rows.append(score_row(y_test.to_numpy(), test_prob, .50, "EMSCAD", name, "test_default_0.50"))
        rows.append(score_row(y_test.to_numpy(), test_prob, threshold, "EMSCAD", name, "test_validation_tuned"))
        print(f"  selected threshold={threshold:.2f}; features={X_train.shape[1]}")
    results = pd.DataFrame(rows)
    results.to_csv(OUT / "EMSCAD_controlled_comparison.csv", index=False)
    return results

def run_phiusiil(path):
    print("\n=== PhiUSIIL reliability checks ===")
    df = pd.read_csv(path, usecols=URL_FEATURES + ["label"])
    raw = pd.to_numeric(df["label"], errors="coerce")
    counts = raw.value_counts(dropna=False).to_dict()
    print("Original label counts:", counts)
    print("ASSUMPTION: source label 0=phishing and 1=legitimate. Verify from official dataset documentation.")
    valid = raw.isin([0, 1])
    df = df.loc[valid].reset_index(drop=True)
    raw = raw.loc[valid].astype(int).reset_index(drop=True)
    y = (raw == 0).astype(int).to_numpy()  # positive = phishing
    X = df[URL_FEATURES].apply(pd.to_numeric, errors="coerce")
    X = X.replace([np.inf, -np.inf], np.nan)
    missing_rows = int(X.isna().any(axis=1).sum())
    missing_by_col = X.isna().sum()
    X = X.fillna(X.median(numeric_only=True)).fillna(0)

    # Stable group IDs from identical feature vectors; prevents same engineered vector
    # from appearing on both sides of group split.
    group_frame = X.round(10).astype(str)
    groups = pd.util.hash_pandas_object(group_frame, index=False).to_numpy()
    unique_groups = len(np.unique(groups))
    dup_rows = int(X.duplicated().sum())
    label_frame = X.copy()
    label_frame["_y"] = y
    label_nunique = label_frame.groupby(URL_FEATURES, dropna=False)["_y"].nunique()
    conflicting = int((label_nunique > 1).sum())
    diagnostics = pd.DataFrame([
        ["Rows with binary labels", len(X)],
        ["Source label 0 count", int((raw == 0).sum())],
        ["Source label 1 count", int((raw == 1).sum())],
        ["Rows with any missing URL feature before imputation", missing_rows],
        ["Duplicate engineered feature rows", dup_rows],
        ["Unique feature vectors with both labels", conflicting],
        ["Unique groups of identical feature vectors", unique_groups],
    ], columns=["Check", "Result"])
    diagnostics.to_csv(OUT / "PhiUSIIL_diagnostics.csv", index=False)
    missing_by_col.rename_axis("Feature").reset_index(name="Missing values").to_csv(
        OUT / "PhiUSIIL_missing_values.csv", index=False)
    print(diagnostics.to_string(index=False))

    results = []
    # Standard random split: comparable to previous baseline.
    idx = np.arange(len(y))
    tr, te = train_test_split(idx, test_size=.30, random_state=SEED, stratify=y)
    model = LogisticRegression(max_iter=2000, random_state=SEED)
    model.fit(X.iloc[tr], y[tr])
    prob = model.predict_proba(X.iloc[te])[:, list(model.classes_).index(1)]
    results.append(score_row(y[te], prob, .50, "PhiUSIIL", "Logistic Regression 18 features", "random_stratified_70_30"))

    # Group split holds identical feature vectors together to probe duplicate-feature leakage.
    splitter = GroupShuffleSplit(n_splits=1, test_size=.30, random_state=SEED)
    try:
        tr_g, te_g = next(splitter.split(X, y, groups=groups))
        if len(np.unique(y[tr_g])) < 2 or len(np.unique(y[te_g])) < 2:
            raise ValueError("Grouped split does not contain both classes.")
        grouped_model = LogisticRegression(max_iter=2000, random_state=SEED)
        grouped_model.fit(X.iloc[tr_g], y[tr_g])
        grouped_prob = grouped_model.predict_proba(X.iloc[te_g])[:, list(grouped_model.classes_).index(1)]
        results.append(score_row(y[te_g], grouped_prob, .50, "PhiUSIIL",
                                 "Logistic Regression 18 features", "grouped_by_identical_features_70_30"))
        print("Grouped split completed. This is a diagnostic; not a substitute for independent/new URL testing.")
    except Exception as e:
        print("Grouped split could not be scored:", e)

    res = pd.DataFrame(results)
    res.to_csv(OUT / "PhiUSIIL_random_vs_grouped.csv", index=False)
    return res, diagnostics

def main():
    em_path = locate(["fake_job_postings.csv", "Fake Postings.csv", "emscad.csv", "EMSCAD.csv"],
                     TEXT_COLS + ["fraudulent"])
    phi_path = locate(["PhiUSIIL_Phishing_URL_Dataset.csv", "phiusiil.csv", "PhiUSIIL.csv"],
                      URL_FEATURES + ["label"])
    em = run_emscad(em_path)
    phi, _ = run_phiusiil(phi_path)
    print("\n=== EMSCAD controlled results (percentages) ===")
    show = em.copy()
    for c in ["Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]:
        show[c] = (show[c] * 100).round(2)
    print(show[["Model", "Evaluation", "Threshold", "Accuracy", "Precision", "Recall",
                "F1-score", "ROC-AUC", "FN", "FP"]].to_string(index=False))
    print("\n=== PhiUSIIL results (percentages) ===")
    show = phi.copy()
    for c in ["Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]:
        show[c] = (show[c] * 100).round(3)
    print(show[["Evaluation", "Accuracy", "Precision", "Recall", "F1-score",
                "ROC-AUC", "FN", "FP"]].to_string(index=False))
    print(f"\nDONE. All results saved in: {OUT}")
    print("Use the EMSCAD results on the identical test set for the fair model comparison.")
    print("Do not claim better generalization from the grouped PhiUSIIL split alone.")
if __name__ == "__main__":
    main()
