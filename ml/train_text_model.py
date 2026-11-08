"""
JobGuard AI - EMSCAD Text Model Training Pipeline
Module: ml.train_text_model
Purpose: Trains TF-IDF + Logistic Regression on fake_job_postings.csv using a 70:30 stratified split.
Dataset: data/raw/fake_job_postings.csv (EMSCAD)
Outputs: ml/artifacts/vectorizer.joblib, ml/artifacts/text_model.joblib, ml/artifacts/text_metrics.json
"""

import json
import time
from pathlib import Path
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from sklearn.model_selection import train_test_split

from app.text_preprocessor import clean_text_field, TEXT_COLUMNS


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR.parent / "data" / "raw" / "fake_job_postings.csv"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_RATIO = 0.30


def train():
    print(f"Loading EMSCAD dataset from: {DATA_PATH}")
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"EMSCAD dataset not found at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    print(f"Raw dataset shape: {df.shape}")

    # Clean text columns
    for col in TEXT_COLUMNS:
        df[col] = df[col].fillna("").astype(str)

    # Validate target column
    y = pd.to_numeric(df["fraudulent"], errors="coerce")
    valid_mask = y.isin([0, 1])
    df = df.loc[valid_mask].copy()
    y = y.loc[valid_mask].astype(int)

    # Combine text fields
    combined_text = df[TEXT_COLUMNS].agg(" ".join, axis=1)

    # 70:30 Stratified Split
    x_train_text, x_test_text, y_train, y_test = train_test_split(
        combined_text, y, test_size=TEST_RATIO, random_state=RANDOM_STATE, stratify=y
    )

    print(f"Train split: {len(y_train):,} | Test split: {len(y_test):,}")

    # Feature Extraction: Sublinear TF-IDF (12,000 max dimensions)
    # Fitted strictly on training set to prevent data leakage
    vectorizer = TfidfVectorizer(
        max_features=12000,
        sublinear_tf=True,
        ngram_range=(1, 2),
        stop_words="english"
    )
    start_vec = time.time()
    x_train = vectorizer.fit_transform(x_train_text)
    x_test = vectorizer.transform(x_test_text)
    print(f"TF-IDF fitted in {time.time() - start_vec:.2f}s. Vocabulary size: {len(vectorizer.vocabulary_)}")

    # Model: Logistic Regression with balanced class weights
    model = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE)
    start_fit = time.time()
    model.fit(x_train, y_train)
    fit_duration = time.time() - start_fit
    print(f"Logistic Regression fitted in {fit_duration:.2f}s.")

    # Evaluate on held-out test split
    y_pred = model.predict(x_test)
    y_prob = model.predict_proba(x_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred, labels=[0, 1]).ravel()

    metrics = {
        "dataset": "EMSCAD",
        "pipeline": "TF-IDF (1-2) + Logistic Regression (balanced)",
        "train_n": int(len(y_train)),
        "test_n": int(len(y_test)),
        "split": "70:30",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "fit_duration_seconds": round(fit_duration, 3)
    }

    print("\n--- Measured Test Performance ---")
    print(json.dumps(metrics, indent=2))

    # Persist model artifacts
    vec_path = ARTIFACTS_DIR / "vectorizer.joblib"
    model_path = ARTIFACTS_DIR / "text_model.joblib"
    metrics_path = ARTIFACTS_DIR / "text_metrics.json"

    joblib.dump(vectorizer, vec_path)
    joblib.dump(model, model_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nArtifacts successfully written to: {ARTIFACTS_DIR}")


if __name__ == "__main__":
    train()
