"""
JobGuard AI - PhiUSIIL URL Model Training Pipeline
Module: ml.train_url_model
Purpose: Trains XGBoost and Logistic Regression classifiers on the 18 numerical URL features
         from PhiUSIIL_Phishing_URL_Dataset.csv using a 70:30 stratified split.
Dataset: data/raw/PhiUSIIL_Phishing_URL_Dataset.csv (PhiUSIIL)
Outputs: ml/artifacts/url_model.joblib, ml/artifacts/url_metrics.json
"""

import json
import time
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app.url_extractor import URL_FEATURE_NAMES


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR.parent / "data" / "raw" / "PhiUSIIL_Phishing_URL_Dataset.csv"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_RATIO = 0.30


def train():
    print(f"Loading PhiUSIIL dataset from: {DATA_PATH}")
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"PhiUSIIL dataset not found at {DATA_PATH}")

    required_cols = URL_FEATURE_NAMES + ["label"]
    df = pd.read_csv(DATA_PATH, usecols=required_cols).dropna(subset=["label"]).copy()
    print(f"Loaded records: {len(df):,}")

    # Convert features to numeric and handle any infinite or null values
    for col in URL_FEATURE_NAMES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[URL_FEATURE_NAMES] = df[URL_FEATURE_NAMES].replace([np.inf, -np.inf], np.nan).fillna(0)

    # Label Mapping: Source label 0 = phishing, 1 = legitimate.
    # Map phishing to positive class (1) for standardized precision/recall interpretation
    orig_label = pd.to_numeric(df["label"], errors="coerce")
    valid_mask = orig_label.isin([0, 1])
    df = df.loc[valid_mask].copy()
    y = (orig_label.loc[valid_mask] == 0).astype(int)

    X = df[URL_FEATURE_NAMES]

    # 70:30 Stratified Split
    x_train, x_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_RATIO, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train split: {len(y_train):,} | Test split: {len(y_test):,}")

    # Model 1: XGBoost Classifier
    print("\nTraining XGBoost Classifier on 18 URL features...")
    xgb_model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=RANDOM_STATE,
        eval_metric="logloss"
    )
    start_xgb = time.time()
    xgb_model.fit(x_train, y_train)
    xgb_duration = time.time() - start_xgb
    print(f"XGBoost fitted in {xgb_duration:.2f}s.")

    # Evaluate XGBoost
    y_pred_xgb = xgb_model.predict(x_test)
    y_prob_xgb = xgb_model.predict_proba(x_test)[:, 1]
    acc_xgb = float(accuracy_score(y_test, y_pred_xgb))
    prec_xgb = float(precision_score(y_test, y_pred_xgb, zero_division=0))
    rec_xgb = float(recall_score(y_test, y_pred_xgb, zero_division=0))
    f1_xgb = float(f1_score(y_test, y_pred_xgb, zero_division=0))
    auc_xgb = float(roc_auc_score(y_test, y_prob_xgb))
    tn_x, fp_x, fn_x, tp_x = confusion_matrix(y_test, y_pred_xgb, labels=[0, 1]).ravel()

    # Model 2: Logistic Regression baseline
    print("\nTraining Logistic Regression baseline on 18 URL features...")
    lr_model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    start_lr = time.time()
    lr_model.fit(x_train, y_train)
    lr_duration = time.time() - start_lr
    print(f"Logistic Regression fitted in {lr_duration:.2f}s.")

    y_pred_lr = lr_model.predict(x_test)
    y_prob_lr = lr_model.predict_proba(x_test)[:, 1]
    acc_lr = float(accuracy_score(y_test, y_pred_lr))
    prec_lr = float(precision_score(y_test, y_pred_lr, zero_division=0))
    rec_lr = float(recall_score(y_test, y_pred_lr, zero_division=0))
    f1_lr = float(f1_score(y_test, y_pred_lr, zero_division=0))
    auc_lr = float(roc_auc_score(y_test, y_prob_lr))
    tn_l, fp_l, fn_l, tp_l = confusion_matrix(y_test, y_pred_lr, labels=[0, 1]).ravel()

    metrics = {
        "dataset": "PhiUSIIL",
        "split": "70:30",
        "features_used": URL_FEATURE_NAMES,
        "train_n": int(len(y_train)),
        "test_n": int(len(y_test)),
        "xgboost": {
            "accuracy": round(acc_xgb, 5),
            "precision": round(prec_xgb, 5),
            "recall": round(rec_xgb, 5),
            "f1_score": round(f1_xgb, 5),
            "roc_auc": round(auc_xgb, 5),
            "fit_seconds": round(xgb_duration, 3),
            "confusion_matrix": [int(tn_x), int(fp_x), int(fn_x), int(tp_x)]
        },
        "logistic_regression": {
            "accuracy": round(acc_lr, 5),
            "precision": round(prec_lr, 5),
            "recall": round(rec_lr, 5),
            "f1_score": round(f1_lr, 5),
            "roc_auc": round(auc_lr, 5),
            "fit_seconds": round(lr_duration, 3),
            "confusion_matrix": [int(tn_l), int(fp_l), int(fn_l), int(tp_l)]
        }
    }

    print("\n--- Measured URL Model Performance ---")
    print(json.dumps(metrics, indent=2))

    # Persist the primary production URL model (XGBoost)
    model_path = ARTIFACTS_DIR / "url_model.joblib"
    lr_path = ARTIFACTS_DIR / "url_logreg_model.joblib"
    metrics_path = ARTIFACTS_DIR / "url_metrics.json"

    joblib.dump(xgb_model, model_path)
    joblib.dump(lr_model, lr_path)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nURL artifacts successfully written to: {ARTIFACTS_DIR}")


if __name__ == "__main__":
    train()
