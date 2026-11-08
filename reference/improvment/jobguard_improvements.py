"""
JobGuard AI - Four Improvement Experiments
1) EMSCAD class-weighted Logistic Regression
2) Threshold tuning using validation data only
3) Compare TF-IDF word/character n-gram configurations
4) PhiUSIIL label, duplicate, and feature-leakage diagnostics

Put this script beside:
  - fake_job_postings.csv
  - PhiUSIIL_Phishing_URL_Dataset.csv
Run:
  python jobguard_improvements.py

Install:
  python -m pip install pandas numpy scikit-learn
Optional: xgboost is not required by this experiment script.

IMPORTANT:
- Test set is held out from threshold/model selection.
- The script reports measured results; it does not assume improvements in advance.
- PhiUSIIL label mapping below assumes source label 0 = phishing and 1 = legitimate.
  Confirm this against the dataset's official documentation before using results.
"""
from pathlib import Path
import warnings
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix
)

warnings.filterwarnings("ignore")
BASE = Path(__file__).resolve().parent
OUT = BASE / "JobGuard_Improvement_Results"
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
                return path
    entered = input(f"Enter full path to {candidates[0]}: ").strip().strip('"')
    path = Path(entered)
    if not path.exists():
        raise FileNotFoundError(path)
    cols = pd.read_csv(path, nrows=0).columns
    missing = [c for c in required if c not in cols]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    return path

def metrics(y, pred, prob):
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "Accuracy": accuracy_score(y, pred),
        "Precision": precision_score(y, pred, zero_division=0),
        "Recall": recall_score(y, pred, zero_division=0),
        "F1-score": f1_score(y, pred, zero_division=0),
        "ROC-AUC": roc_auc_score(y, prob),
        "TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)
    }

def choose_threshold(y_val, val_prob):
    # Maximize validation F1. Tie-break toward the higher threshold (precision).
    candidates = np.arange(0.10, 0.91, 0.01)
    scored = []
    for t in candidates:
        pred = (val_prob >= t).astype(int)
        scored.append((f1_score(y_val, pred, zero_division=0),
                       precision_score(y_val, pred, zero_division=0), t))
    return max(scored)[2]

def run_emscad(path):
    print("\n[1–3] EMSCAD: class weights, threshold tuning, TF-IDF experiments")
    df = pd.read_csv(path)
    for col in TEXT_COLS:
        df[col] = df[col].fillna("").astype(str)
    y0 = pd.to_numeric(df["fraudulent"], errors="coerce")
    valid = y0.isin([0, 1])
    df, y = df.loc[valid].copy(), y0.loc[valid].astype(int)
    text = df[TEXT_COLS].agg(" ".join, axis=1).reset_index(drop=True)
    y = y.reset_index(drop=True)
    if y.nunique() != 2:
        raise ValueError("EMSCAD target must contain fraudulent=1 and legitimate=0.")

    # 70% development / 30% final test. Validation comes only from development set.
    x_dev, x_test, y_dev, y_test = train_test_split(
        text, y, test_size=.30, random_state=SEED, stratify=y
    )
    x_train, x_val, y_train, y_val = train_test_split(
        x_dev, y_dev, test_size=.20, random_state=SEED, stratify=y_dev
    )

    configs = [
        ("word_1_2_unweighted", dict(analyzer="word", ngram_range=(1, 2), min_df=2,
                                     max_features=20000, sublinear_tf=True, stop_words="english"),
         None),
        ("word_1_2_balanced", dict(analyzer="word", ngram_range=(1, 2), min_df=2,
                                   max_features=20000, sublinear_tf=True, stop_words="english"),
         "balanced"),
        ("word_1_3_balanced", dict(analyzer="word", ngram_range=(1, 3), min_df=2,
                                   max_features=25000, sublinear_tf=True, stop_words="english"),
         "balanced"),
        ("char_3_5_balanced", dict(analyzer="char", ngram_range=(3, 5), min_df=2,
                                   max_features=30000, sublinear_tf=True),
         "balanced"),
    ]
    rows = []
    for name, vec_args, class_weight in configs:
        print(f"  Testing {name} ...")
        vectorizer = TfidfVectorizer(**vec_args)
        X_train = vectorizer.fit_transform(x_train)
        X_val = vectorizer.transform(x_val)
        X_test = vectorizer.transform(x_test)
        model = LogisticRegression(
            max_iter=2000, class_weight=class_weight, random_state=SEED,
            solver="liblinear"
        )
        model.fit(X_train, y_train)
        val_prob = model.predict_proba(X_val)[:, list(model.classes_).index(1)]
        threshold = choose_threshold(y_val, val_prob)
        test_prob = model.predict_proba(X_test)[:, list(model.classes_).index(1)]

        # Evaluate default threshold and validation-selected threshold on same final test set.
        for threshold_name, t in [("default_0.50", 0.50), ("validation_tuned", threshold)]:
            test_pred = (test_prob >= t).astype(int)
            row = {
                "Dataset": "EMSCAD", "Experiment": name,
                "Class weight": class_weight or "none",
                "Threshold type": threshold_name, "Threshold": round(float(t), 3),
                "Train n": len(y_train), "Validation n": len(y_val), "Test n": len(y_test),
                "Feature count": X_train.shape[1],
                **metrics(y_test, test_pred, test_prob)
            }
            rows.append(row)
    result = pd.DataFrame(rows)
    result.to_csv(OUT / "EMSCAD_improvement_results.csv", index=False)
    return result

def run_phiusiil(path):
    print("\n[4] PhiUSIIL: label mapping, duplicate, and leakage diagnostics")
    # Load full CSV for diagnosis, but only required features/label for modeling.
    header = pd.read_csv(path, nrows=0).columns.tolist()
    required = URL_FEATURES + ["label"]
    missing = [c for c in required if c not in header]
    if missing:
        raise ValueError(f"PhiUSIIL missing expected columns: {missing}")
    df = pd.read_csv(path, usecols=required)
    raw_label = pd.to_numeric(df["label"], errors="coerce")
    label_counts = raw_label.value_counts(dropna=False).to_dict()
    print("  Original label counts:", label_counts)
    print("  Mapping assumption: source 0=phishing, source 1=legitimate; phishing becomes positive class 1.")
    print("  Confirm this mapping with the official dataset documentation.")

    valid = raw_label.isin([0, 1])
    df = df.loc[valid].copy()
    raw_label = raw_label.loc[valid].astype(int)
    y = (raw_label == 0).astype(int)  # phishing=1
    X = df[URL_FEATURES].apply(pd.to_numeric, errors="coerce")
    X = X.replace([np.inf, -np.inf], np.nan)

    # Diagnose missingness and duplicate feature rows before filling values.
    missing_by_feature = X.isna().sum().sort_values(ascending=False)
    dup_feature_rows = int(X.duplicated().sum())
    # Same feature vector assigned to both labels is a potential conflict / leakage warning.
    diagnostic = X.copy()
    diagnostic["_label"] = y.to_numpy()
    label_counts_per_vector = diagnostic.groupby(URL_FEATURES, dropna=False)["_label"].nunique()
    conflicting_vectors = int((label_counts_per_vector > 1).sum())

    diag = pd.DataFrame({
        "Check": [
            "Rows after valid binary-label filter",
            "Original label 0 count",
            "Original label 1 count",
            "Duplicate URL-feature rows",
            "Unique feature vectors associated with both labels",
            "Rows with any missing URL feature",
        ],
        "Result": [
            len(df), int((raw_label == 0).sum()), int((raw_label == 1).sum()),
            dup_feature_rows, conflicting_vectors, int(X.isna().any(axis=1).sum())
        ]
    })
    diag.to_csv(OUT / "PhiUSIIL_data_quality_diagnostics.csv", index=False)
    missing_by_feature.rename_axis("Feature").reset_index(name="Missing values").to_csv(
        OUT / "PhiUSIIL_missing_values_by_feature.csv", index=False
    )
    print(diag.to_string(index=False))
    print("  Note: identical engineered feature vectors are not necessarily duplicate URLs.")
    print("  The CSV subset does not contain raw URL text, so exact URL duplicate checks and time-based testing")
    print("  require the original URL column or a newer independent dataset.")

    X = X.fillna(X.median(numeric_only=True)).fillna(0)
    x_train, x_test, y_train, y_test = train_test_split(
        X, y, test_size=.30, random_state=SEED, stratify=y
    )
    model = LogisticRegression(max_iter=2000, class_weight=None, random_state=SEED)
    model.fit(x_train, y_train)
    prob = model.predict_proba(x_test)[:, list(model.classes_).index(1)]
    pred = (prob >= .50).astype(int)
    result = pd.DataFrame([{
        "Dataset": "PhiUSIIL", "Pipeline": "18 URL features + Logistic Regression",
        "Split": "70:30", "Positive class": "phishing (assuming source label 0)",
        "Train n": len(y_train), "Test n": len(y_test), **metrics(y_test, pred, prob)
    }])
    result.to_csv(OUT / "PhiUSIIL_rechecked_baseline.csv", index=False)
    return result, diag

def main():
    em_path = locate(["fake_job_postings.csv", "Fake Postings.csv", "emscad.csv", "EMSCAD.csv"],
                     TEXT_COLS + ["fraudulent"])
    phi_path = locate(["PhiUSIIL_Phishing_URL_Dataset.csv", "phiusiil.csv", "PhiUSIIL.csv"],
                      URL_FEATURES + ["label"])
    em = run_emscad(em_path)
    phi, diag = run_phiusiil(phi_path)
    print("\n=== EMSCAD experiments (scores are decimals; multiply by 100 for %) ===")
    print(em[["Experiment", "Threshold type", "Threshold", "Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC", "FN", "FP"]].to_string(index=False))
    print("\n=== PhiUSIIL recheck ===")
    print(phi.to_string(index=False))
    print(f"\nFinished. Files saved to: {OUT}")
    print("Do not claim a metric improved unless its measured result beats the previous baseline.")
    print("Use the validation-tuned threshold only if its held-out test trade-off is acceptable.")
if __name__ == "__main__":
    main()
