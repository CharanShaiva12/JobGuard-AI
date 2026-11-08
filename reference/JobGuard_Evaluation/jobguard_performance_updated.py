"""
JobGuard AI - Performance Evaluation (70:30 split only)

Pipelines evaluated:
1. EMSCAD: TF-IDF + Logistic Regression
2. PhiUSIIL: URL features + XGBoost (XGBClassifier)
3. PhiUSIIL: URL features + Logistic Regression (statistical/linear baseline)

The "combined comparison" is the arithmetic mean of the three pipelines' metric scores.
It is a comparison summary, NOT a fourth model trained on merged datasets. EMSCAD and
PhiUSIIL represent different classification tasks, so their records are not merged.

Place this script and both CSV datasets in the same folder, then run:
    python jobguard_performance_updated.py

Required packages:
    python -m pip install pandas numpy matplotlib scikit-learn xgboost python-docx
"""

from pathlib import Path
import time
import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix
)

try:
    from xgboost import XGBClassifier
except ImportError:
    raise SystemExit(
        "The xgboost package is required for the XGBoost pipeline.\n"
        "Install it in the VS Code terminal using:\n"
        "python -m pip install xgboost"
    )

warnings.filterwarnings("ignore")

# -------------------------- SETTINGS --------------------------

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "JobGuard_Results"
OUTPUT_DIR.mkdir(exist_ok=True)

# User requested only this train-test split.
TRAIN_PERCENT = 70
TEST_PERCENT = 30
RANDOM_STATE = 42

EMSCAD_CANDIDATES = [
    "fake_job_postings.csv", "Fake Postings.csv", "emscad.csv", "EMSCAD.csv"
]
PHIUSIIL_CANDIDATES = [
    "PhiUSIIL_Phishing_URL_Dataset.csv", "phiusiil.csv", "PhiUSIIL.csv"
]

# The 18 numeric URL features expected in the PhiUSIIL dataset.
URL_FEATURES = [
    "URLLength", "DomainLength", "IsDomainIP", "TLDLength",
    "NoOfSubDomain", "HasObfuscation", "NoOfObfuscatedChar",
    "ObfuscationRatio", "NoOfLettersInURL", "LetterRatioInURL",
    "NoOfDegitsInURL", "DegitRatioInURL", "NoOfEqualsInURL",
    "NoOfQMarkInURL", "NoOfAmpersandInURL",
    "NoOfOtherSpecialCharsInURL", "SpacialCharRatioInURL", "IsHTTPS"
]
TEXT_COLUMNS = ["title", "company_profile", "description", "requirements", "benefits"]
METRICS = ["Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]


def find_dataset(candidates, required_columns, description):
    """Look for a matching CSV next to this script; ask for its path if not found."""
    for filename in candidates:
        candidate = BASE_DIR / filename
        if candidate.exists():
            try:
                header = pd.read_csv(candidate, nrows=0).columns
                if all(col in header for col in required_columns):
                    print(f"Found {description}: {candidate.name}")
                    return candidate
                print(f"Skipping {candidate.name}: required columns not found.")
            except Exception as exc:
                print(f"Could not inspect {candidate.name}: {exc}")

    print(f"\nCould not automatically find {description}.")
    typed = input(f"Enter the full path to the {description} CSV: ").strip().strip('"')
    candidate = Path(typed)
    if not candidate.exists():
        raise FileNotFoundError(f"File not found: {candidate}")
    header = pd.read_csv(candidate, nrows=0).columns
    missing = [col for col in required_columns if col not in header]
    if missing:
        raise ValueError(
            f"{description} is missing required columns: {missing}\n"
            f"Columns found: {list(header)}"
        )
    return candidate


def get_scores(y_true, y_pred, y_prob):
    """Calculate standard classification metrics; positive class is labelled 1."""
    return {
        "Accuracy": accuracy_score(y_true, y_pred),
        "Precision": precision_score(y_true, y_pred, zero_division=0),
        "Recall": recall_score(y_true, y_pred, zero_division=0),
        "F1-score": f1_score(y_true, y_pred, zero_division=0),
        "ROC-AUC": roc_auc_score(y_true, y_prob),
    }


def save_roc_data(y_true, y_score, filename):
    """
    Save actual test labels and positive-class prediction probabilities.
    These columns are used later to draw a genuine ROC curve.
    """
    roc_df = pd.DataFrame({
        "y_true": np.asarray(y_true, dtype=int),
        "y_score": np.asarray(y_score, dtype=float)
    })
    output_path = OUTPUT_DIR / filename
    roc_df.to_csv(output_path, index=False)
    print(
        f"ROC prediction data saved: {output_path.name} "
        f"({len(roc_df):,} test records)"
    )
    return output_path



def split_data(X, y):
    """Create the single stratified 70:30 train-test split."""
    return train_test_split(
        X, y, test_size=TEST_PERCENT / 100,
        random_state=RANDOM_STATE, stratify=y
    )


def run_emscad(path):
    """Train TF-IDF + Logistic Regression for fraudulent job-posting detection."""
    print("\n" + "=" * 72)
    print("EMSCAD: TF-IDF + Logistic Regression (70:30)")
    print("=" * 72)
    df = pd.read_csv(path)

    missing = [c for c in TEXT_COLUMNS + ["fraudulent"] if c not in df.columns]
    if missing:
        raise ValueError(f"EMSCAD file is missing required columns: {missing}")

    for col in TEXT_COLUMNS:
        df[col] = df[col].fillna("").astype(str)

    # Positive class 1 means a fraudulent job posting.
    y = pd.to_numeric(df["fraudulent"], errors="coerce")
    valid = y.isin([0, 1])
    df = df.loc[valid].copy()
    y = y.loc[valid].astype(int)
    if y.nunique() != 2:
        raise ValueError("EMSCAD must contain fraudulent=1 and legitimate=0 records.")

    # Combine the available text fields into one document per job posting.
    text = df[TEXT_COLUMNS].agg(" ".join, axis=1)
    x_train_text, x_test_text, y_train, y_test = split_data(text, y)

    # Fit TF-IDF only on training text to avoid data leakage from the test set.
    vectorizer = TfidfVectorizer(
        max_features=12000, sublinear_tf=True,
        ngram_range=(1, 2), stop_words="english"
    )
    x_train = vectorizer.fit_transform(x_train_text)
    x_test = vectorizer.transform(x_test_text)

    model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    start = time.time()
    model.fit(x_train, y_train)
    fit_seconds = time.time() - start

    y_pred = model.predict(x_test)
    positive_index = list(model.classes_).index(1)
    y_prob = model.predict_proba(x_test)[:, positive_index]
    save_roc_data(
        y_test, y_prob, "EMSCAD_LogisticRegression_ROC.csv"
    )
    scores = get_scores(y_test, y_pred, y_prob)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])

    row = {
        "Dataset": "EMSCAD",
        "Pipeline": "TF-IDF + Logistic Regression",
        "Split": "70:30",
        "Train %": TRAIN_PERCENT, "Test %": TEST_PERCENT,
        "Train n": len(y_train), "Test n": len(y_test),
        "Feature extraction": "TF-IDF text features",
        "Classifier": "Logistic Regression",
        **scores,
        "Fit seconds": round(fit_seconds, 3),
        "Feature count": x_train.shape[1],
        "Confusion matrix (TN, FP, FN, TP)": str(cm.ravel().tolist()),
    }
    print(f"Train records: {len(y_train):,} | Test records: {len(y_test):,}")
    print("Confusion matrix [TN, FP, FN, TP]:", cm.ravel().tolist())
    return row


def load_phiusiil(path):
    """Load and clean the selected URL features and the dataset target."""
    required = URL_FEATURES + ["label"]
    df = pd.read_csv(path, usecols=required).dropna(subset=["label"]).copy()
    for col in URL_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[URL_FEATURES] = (
        df[URL_FEATURES].replace([np.inf, -np.inf], np.nan).fillna(0)
    )

    original_labels = pd.to_numeric(df["label"], errors="coerce")
    valid = original_labels.isin([0, 1])
    df = df.loc[valid].copy()
    original_labels = original_labels.loc[valid].astype(int)

    # Assumption from the source pipeline: source label 0 = phishing, 1 = legitimate.
    # Convert phishing to positive class 1 for consistent precision/recall interpretation.
    y = (original_labels == 0).astype(int)
    if y.nunique() != 2:
        raise ValueError("PhiUSIIL must contain both phishing and legitimate labels.")
    return df[URL_FEATURES], y


def run_phiusiil_model(path, algorithm):
    """Train either XGBoost or Logistic Regression on the same 18 URL features."""
    if algorithm == "XGBoost":
        pipeline = "18 URL features + XGBoost"
    else:
        pipeline = "18 URL features + Logistic Regression"

    print("\n" + "=" * 72)
    print(f"PhiUSIIL: {pipeline} (70:30)")
    print("=" * 72)

    X, y = load_phiusiil(path)
    x_train, x_test, y_train, y_test = split_data(X, y)

    if algorithm == "XGBoost":
        # Use a reproducible boosted-tree classifier.
        model = XGBClassifier(
            n_estimators=250,
            max_depth=6,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1
        )
        classifier_name = "XGBoost (XGBClassifier)"
    else:
        # Logistic Regression is used as the statistical/linear baseline.
        model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
        classifier_name = "Logistic Regression"

    start = time.time()
    model.fit(x_train, y_train)
    fit_seconds = time.time() - start

    y_pred = model.predict(x_test)
    y_prob = model.predict_proba(x_test)[:, list(model.classes_).index(1)]
    roc_filename = (
        "PhiUSIIL_XGBoost_ROC.csv" if algorithm == "XGBoost"
        else "PhiUSIIL_LogisticRegression_ROC.csv"
    )
    save_roc_data(y_test, y_prob, roc_filename)
    scores = get_scores(y_test, y_pred, y_prob)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])

    row = {
        "Dataset": "PhiUSIIL",
        "Pipeline": pipeline,
        "Split": "70:30",
        "Train %": TRAIN_PERCENT, "Test %": TEST_PERCENT,
        "Train n": len(y_train), "Test n": len(y_test),
        "Feature extraction": "18 numerical URL features",
        "Classifier": classifier_name,
        **scores,
        "Fit seconds": round(fit_seconds, 3),
        "Feature count": len(URL_FEATURES),
        "Confusion matrix (TN, FP, FN, TP)": str(cm.ravel().tolist()),
    }
    print(f"Train records: {len(y_train):,} | Test records: {len(y_test):,}")
    print("Confusion matrix [TN, FP, FN, TP]:", cm.ravel().tolist())
    return row


def make_combined_comparison(rows):
    """
    Make an arithmetic mean across the three measured pipelines.
    This is only a comparison summary, not a trained model.
    """
    result = {
        "Dataset": "Combined comparison (mean of 3 pipelines)",
        "Pipeline": "Arithmetic mean of the three pipeline scores",
        "Split": "70:30",
        "Train %": TRAIN_PERCENT, "Test %": TEST_PERCENT,
        "Train n": sum(int(row["Train n"]) for row in rows),
        "Test n": sum(int(row["Test n"]) for row in rows),
        "Feature extraction": "Different feature spaces; not merged",
        "Classifier": "Not a trained classifier",
        "Fit seconds": np.nan,
        "Feature count": np.nan,
        "Confusion matrix (TN, FP, FN, TP)": "Not applicable",
    }
    for metric in METRICS:
        result[metric] = float(np.mean([row[metric] for row in rows]))
    return result


def save_graphs(results_df):
    """Create four graphs based on the 70:30 results, plus an extra box plot."""
    labels = [
        "EMSCAD\nTF-IDF + Logistic Regression",
        "PhiUSIIL\nURL + XGBoost",
        "PhiUSIIL\nURL + Logistic Regression",
        "Combined\n(mean summary)"
    ]
    actual_rows = results_df.iloc[:3].copy()
    combined_row = results_df.iloc[3].copy()
    all_rows = pd.concat([actual_rows, pd.DataFrame([combined_row])], ignore_index=True)
    colors = ["#6F7652", "#B66A4A", "#4C8190", "#888888"]

    # Convert scores from fractions to percentages for readable graph axes.
    values = all_rows[METRICS].astype(float) * 100

    # 1. Scatter plot: precision against recall for each pipeline and the summary.
    fig, ax = plt.subplots(figsize=(9, 6))
    for i, row in all_rows.iterrows():
        ax.scatter(row["Recall"] * 100, row["Precision"] * 100,
                   s=130, color=colors[i], label=labels[i])
        ax.annotate(labels[i].replace("\n", " "), 
                    (row["Recall"] * 100, row["Precision"] * 100),
                    xytext=(5, 5), textcoords="offset points", fontsize=8)
    ax.set_title("JobGuard AI — Precision vs Recall (70:30 split)")
    ax.set_xlabel("Recall (%)")
    ax.set_ylabel("Precision (%)")
    ax.set_xlim(0, 105)
    ax.set_ylim(0, 105)
    ax.grid(True, alpha=0.25)
    ax.legend(fontsize=7, frameon=False, loc="lower right")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "01_precision_recall_scatter.png", dpi=240, bbox_inches="tight")
    plt.close(fig)

    # 2. Grouped bar chart: all five metrics for each result.
    fig, ax = plt.subplots(figsize=(12, 6.5))
    x = np.arange(len(METRICS))
    width = 0.19
    for i, row in values.iterrows():
        ax.bar(x + (i - 1.5) * width, row.values, width,
               label=labels[i].replace("\n", " "), color=colors[i])
    ax.set_title("JobGuard AI — Metric Comparison (70:30 split)")
    ax.set_xlabel("Evaluation metric")
    ax.set_ylabel("Score (%)")
    ax.set_xticks(x)
    ax.set_xticklabels(METRICS)
    ax.set_ylim(0, 105)
    ax.grid(axis="y", alpha=0.25)
    ax.legend(fontsize=7, frameon=False)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "02_bar_metrics_70_30.png", dpi=240, bbox_inches="tight")
    plt.close(fig)

    # 3. Line graph: metric profile for each pipeline.
    fig, ax = plt.subplots(figsize=(11, 6))
    for i, row in values.iterrows():
        ax.plot(METRICS, row.values, marker="o", linewidth=2,
                label=labels[i].replace("\n", " "), color=colors[i])
        for j, val in enumerate(row.values):
            ax.annotate(f"{val:.2f}", (j, val), xytext=(0, 5),
                        textcoords="offset points", ha="center", fontsize=7)
    ax.set_title("JobGuard AI — Metric Profile (70:30 split)")
    ax.set_xlabel("Evaluation metric")
    ax.set_ylabel("Score (%)")
    ax.set_ylim(0, 105)
    ax.grid(True, alpha=0.25)
    ax.legend(fontsize=7, frameon=False)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "03_line_metrics_70_30.png", dpi=240, bbox_inches="tight")
    plt.close(fig)

    # 4. Large box plot: distribution of the five metric scores per pipeline.
    # This summarizes different metrics from one split, not repeated trials.
    fig, ax = plt.subplots(figsize=(12, 8))
    box = ax.boxplot(
        [values.iloc[i].values for i in range(len(values))],
        patch_artist=True, tick_labels=[label.replace("\n", "\n") for label in labels],
        showmeans=True, meanprops={"marker": "D", "markerfacecolor": "white",
                                   "markeredgecolor": "black", "markersize": 7}
    )
    for patch, color in zip(box["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.75)
    for element in ["whiskers", "caps", "medians"]:
        for item in box[element]:
            item.set_linewidth(1.5)
    ax.set_title("JobGuard AI — Large Box Plot of Metric Scores (70:30 split)", pad=16)
    ax.set_ylabel("Metric score (%)")
    ax.set_ylim(0, 105)
    ax.grid(axis="y", alpha=0.25)
    ax.text(
        0.01, -0.18,
        "How to read: each box summarizes Accuracy, Precision, Recall, F1-score and ROC-AUC for one result. "
        "The line is the median and the white diamond is the mean. These are different metrics from one split, "
        "not repeated trials or a confidence interval.",
        transform=ax.transAxes, fontsize=9, va="top", wrap=True
    )
    fig.subplots_adjust(bottom=0.27)
    fig.savefig(OUTPUT_DIR / "04_large_box_plot_70_30.png", dpi=240, bbox_inches="tight")
    plt.close(fig)


def save_word_report(results_df):
    """Create a simple DOCX summary if python-docx is installed."""
    try:
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.enum.table import WD_TABLE_ALIGNMENT
    except ImportError:
        print("python-docx not installed; skipping optional Word report.")
        return None

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)

    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(10)
    doc.styles["Heading 1"].font.color.rgb = RGBColor(101, 118, 74)

    title = doc.add_heading("JobGuard AI — Performance Evaluation", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph(
        "Evaluation uses a stratified 70:30 train-test split for three pipelines: "
        "EMSCAD TF-IDF + Logistic Regression; PhiUSIIL URL features + XGBoost; "
        "and PhiUSIIL URL features + Logistic Regression."
    )
    doc.add_paragraph(
        "The combined comparison is the arithmetic mean of the three scores and is not a trained model."
    )

    headers = ["Dataset", "Pipeline", "Split", "Train", "Test",
               "Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        table.rows[0].cells[i].text = h
    for _, row in results_df.iterrows():
        cells = table.add_row().cells
        vals = [
            row["Dataset"], row["Pipeline"], row["Split"],
            f'{int(row["Train n"]):,}', f'{int(row["Test n"]):,}',
            *[f'{row[m] * 100:.2f}%' for m in METRICS]
        ]
        for i, val in enumerate(vals):
            cells[i].text = str(val)
    doc.add_heading("Graphs", level=1)
    for caption, filename in [
        ("Figure 1. Precision–recall scatter plot.", "01_precision_recall_scatter.png"),
        ("Figure 2. Metric comparison bar chart.", "02_bar_metrics_70_30.png"),
        ("Figure 3. Metric profile line chart.", "03_line_metrics_70_30.png"),
        ("Figure 4. Large box plot of metric scores.", "04_large_box_plot_70_30.png")
    ]:
        p = doc.add_paragraph(caption)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.add_picture(str(OUTPUT_DIR / filename), width=Inches(6.1))

    doc.add_heading("Results interpretation", level=1)
    doc.add_paragraph(
        "The EMSCAD pipeline should be assessed particularly by recall because missed fraudulent job postings "
        "are a concern. The two PhiUSIIL URL pipelines are compared using the same 18 URL features. The combined "
        "row is only a summary of scores across different tasks and should not be interpreted as a third model."
    )
    doc.add_heading("Improvement focus", level=1)
    doc.add_paragraph(
        "For EMSCAD, evaluate the decision threshold using validation data, compare class-weighted training, "
        "tune TF-IDF settings, and inspect missed fraudulent postings. For PhiUSIIL, verify label mapping and "
        "feature definitions and test on newer independent URLs. Re-run evaluation before reporting any improved scores."
    )
    path = OUTPUT_DIR / "JobGuard_Performance_Report.docx"
    doc.save(path)
    return path


def main():
    print("\nJOBGUARD AI PERFORMANCE EVALUATION — 70:30 SPLIT ONLY")
    print("Pipelines: EMSCAD + Logistic Regression; PhiUSIIL + XGBoost; PhiUSIIL + Logistic Regression.")
    print("The combined row is a comparison summary, not a trained model.\n")

    emscad_path = find_dataset(
        EMSCAD_CANDIDATES,
        TEXT_COLUMNS + ["fraudulent"],
        "EMSCAD job-posting dataset"
    )
    phi_path = find_dataset(
        PHIUSIIL_CANDIDATES,
        URL_FEATURES + ["label"],
        "PhiUSIIL phishing URL dataset"
    )

    # Train and evaluate each of the three requested pipelines.
    measured = [
        run_emscad(emscad_path),
        run_phiusiil_model(phi_path, "XGBoost"),
        run_phiusiil_model(phi_path, "Logistic Regression"),
    ]
    combined = make_combined_comparison(measured)
    results_df = pd.DataFrame(measured + [combined])

    # Save complete numerical results and print a compact terminal table.
    csv_path = OUTPUT_DIR / "JobGuard_Measured_Results_70_30.csv"
    results_df.to_csv(csv_path, index=False)

    print("\n" + "=" * 112)
    print("MEASURED RESULTS — 70:30 SPLIT (scores shown as percentages)")
    print("=" * 112)
    display_cols = ["Dataset", "Pipeline", "Split", "Train n", "Test n"] + METRICS
    display = results_df[display_cols].copy()
    for metric in METRICS:
        display[metric] = (display[metric] * 100).map(lambda v: f"{v:.2f}%")
    print(display.to_string(index=False))

    print("\nCreating four graphs...")
    save_graphs(results_df)

    print("Creating optional Word report...")
    report_path = save_word_report(results_df)

    print("\nDONE. Files saved in:")
    print(OUTPUT_DIR)
    print("- JobGuard_Measured_Results_70_30.csv")
    print("- 01_precision_recall_scatter.png")
    print("- 02_bar_metrics_70_30.png")
    print("- 03_line_metrics_70_30.png")
    print("- 04_large_box_plot_70_30.png")
    print("- EMSCAD_LogisticRegression_ROC.csv")
    print("- PhiUSIIL_XGBoost_ROC.csv")
    print("- PhiUSIIL_LogisticRegression_ROC.csv")
    if report_path:
        print(f"- {report_path.name}")
    print("\nNote: combined scores are an arithmetic-mean comparison, not a trained combined model.")


if __name__ == "__main__":
    main()
