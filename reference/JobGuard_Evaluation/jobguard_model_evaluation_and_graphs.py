"""
JobGuard AI - Model Evaluation and Graph Generation
==================================================

This script:
1. Loads the EMSCAD job-posting dataset and the PhiUSIIL URL dataset.
2. Trains the selected models using a stratified 70:30 train-test split.
3. Prints a results table directly in the VS Code terminal.
4. Saves the measured results to CSV.
5. Generates four graphs: bar chart, scatter plot, line chart, and box plot.

Selected pipelines:
- EMSCAD: TF-IDF + Logistic Regression
- PhiUSIIL: 18 URL features + HistGradientBoostingClassifier
- PhiUSIIL: 18 URL features + Logistic Regression

IMPORTANT:
- This program trains and evaluates the models. It does not simply draw the table.
- Set the dataset paths below to the actual CSV locations on your computer.
- Verify that the PhiUSIIL target mapping and the selected URL feature columns match
  the dataset documentation and your project's actual implementation.
"""

# --------------------------- 1. Import libraries ----------------------------

import os
import sys
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

warnings.filterwarnings("ignore", category=UserWarning)

# --------------------------- 2. User configuration --------------------------

# Change these two paths to the actual CSV file locations on your PC.
EMSCAD_PATH = r"C:\Users\YOUR_USERNAME\Downloads\fake_job_postings.csv"
PHIUSIIL_PATH = r"C:\Users\YOUR_USERNAME\Downloads\PhiUSIIL_Phishing_URL_Dataset.csv"

# The same seed makes the split reproducible.
RANDOM_STATE = 42
TEST_SIZE = 0.30

# EMSCAD text columns used for TF-IDF.
EMSCAD_TEXT_COLUMNS = [
    "title",
    "company_profile",
    "description",
    "requirements",
    "benefits",
]
EMSCAD_TARGET = "fraudulent"

# The URL feature columns used in the previously described 18-feature pipeline.
# If a column is missing in your CSV, the script stops and shows the missing names.
PHIUSIIL_FEATURES = [
    "URLLength",
    "DomainLength",
    "IsDomainIP",
    "URLSimilarityIndex",
    "CharContinuationRate",
    "TLDLegitimateProb",
    "URLCharProb",
    "TLDLength",
    "NoOfSubDomain",
    "HasObfuscation",
    "NoOfObfuscatedChar",
    "ObfuscationRatio",
    "NoOfLettersInURL",
    "LetterRatioInURL",
    "NoOfDegitsInURL",
    "DegitRatioInURL",
    "NoOfEqualsInURL",
    "NoOfQMarkInURL",
]

# Update this if your dataset documentation says the label encoding is different.
PHIUSIIL_TARGET = "label"

# Assumption from the earlier evaluation: source label 0 = phishing and 1 = legitimate.
# The script maps phishing to positive class 1 for meaningful recall/precision reporting.
PHIUSIIL_PHISHING_SOURCE_VALUE = 0
PHIUSIIL_LEGITIMATE_SOURCE_VALUE = 1

OUTPUT_DIR = "jobguard_evaluation_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --------------------------- 3. Utility functions ---------------------------

def require_columns(dataframe, required_columns, dataset_name):
    """Stop with a helpful message if required columns are not in the CSV."""
    missing = [column for column in required_columns if column not in dataframe.columns]
    if missing:
        raise ValueError(
            f"{dataset_name} is missing these required columns:\n"
            f"{missing}\n\n"
            f"Check the CSV column names and update the configuration near the top "
            f"of this script. Available columns include:\n"
            f"{list(dataframe.columns[:40])}"
        )


def calculate_metrics(y_true, y_pred, y_score):
    """Calculate classification metrics; positive class is encoded as 1."""
    return {
        "Accuracy": accuracy_score(y_true, y_pred) * 100,
        "Precision": precision_score(y_true, y_pred, zero_division=0) * 100,
        "Recall": recall_score(y_true, y_pred, zero_division=0) * 100,
        "F1-score": f1_score(y_true, y_pred, zero_division=0) * 100,
        "ROC-AUC": roc_auc_score(y_true, y_score) * 100,
    }


def print_confusion_matrix(y_true, y_pred, model_name):
    """Print TN, FP, FN, and TP so the output can be checked."""
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    print(f"\nConfusion matrix for {model_name} (positive class = 1):")
    print(f"TN={tn:,}  FP={fp:,}  FN={fn:,}  TP={tp:,}")


def train_and_evaluate(
    dataset_name,
    pipeline_name,
    X,
    y,
    model,
    text_mode=False,
    text_columns=None,
    numeric_columns=None,
):
    """Split data, fit the model, evaluate it, print metrics, and return a row."""
    print(f"\nTraining: {dataset_name} | {pipeline_name}")
    print(f"Total rows: {len(X):,}")

    # Stratification keeps approximately the same class balance in train and test.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    # For EMSCAD, TF-IDF is applied separately to each text column.
    if text_mode:
        transformers = [
            (
                f"tfidf_{column}",
                TfidfVectorizer(
                    max_features=10000,
                    ngram_range=(1, 2),
                    min_df=2,
                    sublinear_tf=True,
                    stop_words="english",
                ),
                column,
            )
            for column in text_columns
        ]
        from sklearn.compose import ColumnTransformer
        from sklearn.pipeline import Pipeline

        estimator = Pipeline(
            steps=[
                ("features", ColumnTransformer(transformers, remainder="drop")),
                ("classifier", model),
            ]
        )
    else:
        # URL columns are numeric. Missing values are imputed from training data.
        # HistGradientBoosting can handle many numeric patterns; scaling is included
        # for Logistic Regression, which is sensitive to feature scale.
        numeric_steps = [("imputer", SimpleImputer(strategy="median"))]
        if isinstance(model, LogisticRegression):
            numeric_steps.append(("scaler", StandardScaler()))
        from sklearn.pipeline import Pipeline
        from sklearn.compose import ColumnTransformer

        preprocessing = ColumnTransformer(
            [("numeric", Pipeline(numeric_steps), numeric_columns)],
            remainder="drop",
        )
        estimator = Pipeline(
            steps=[
                ("features", preprocessing),
                ("classifier", model),
            ]
        )

    # Fit only on the training data; test data is not used to learn preprocessing.
    estimator.fit(X_train, y_train)

    # Predictions and scores for positive class 1.
    predictions = estimator.predict(X_test)
    if hasattr(estimator, "predict_proba"):
        positive_scores = estimator.predict_proba(X_test)[:, 1]
    else:
        positive_scores = estimator.decision_function(X_test)

    metrics = calculate_metrics(y_test, predictions, positive_scores)
    print(f"Train rows: {len(X_train):,} | Test rows: {len(X_test):,}")
    for metric_name, metric_value in metrics.items():
        print(f"{metric_name:12s}: {metric_value:.2f}%")

    print_confusion_matrix(y_test, predictions, pipeline_name)

    # Store a row for the final terminal table and CSV file.
    result = {
        "Dataset": dataset_name,
        "Pipeline": pipeline_name,
        "Train": len(X_train),
        "Test": len(X_test),
        **metrics,
    }
    return result


# --------------------------- 4. Load datasets -------------------------------

def main():
    """Main program: load data, evaluate all three pipelines, and plot graphs."""
    print("=" * 88)
    print("JOBGUARD AI - 70:30 MODEL PERFORMANCE EVALUATION")
    print("=" * 88)

    # Check paths before trying to read the files.
    for path, name in [
        (EMSCAD_PATH, "EMSCAD"),
        (PHIUSIIL_PATH, "PhiUSIIL"),
    ]:
        if not os.path.isfile(path):
            raise FileNotFoundError(
                f"\n{name} CSV was not found:\n{path}\n\n"
                "Edit EMSCAD_PATH and PHIUSIIL_PATH near the top of this program "
                "to point to your actual CSV files."
            )

    # Read datasets. Low-memory mode is disabled to reduce mixed-type warnings.
    print("\nLoading EMSCAD dataset...")
    emscad = pd.read_csv(EMSCAD_PATH, low_memory=False)
    print(f"EMSCAD loaded: {emscad.shape[0]:,} rows, {emscad.shape[1]:,} columns")

    print("\nLoading PhiUSIIL dataset...")
    phiusiil = pd.read_csv(PHIUSIIL_PATH, low_memory=False)
    print(f"PhiUSIIL loaded: {phiusiil.shape[0]:,} rows, {phiusiil.shape[1]:,} columns")

    # Validate column names rather than silently choosing the wrong target/features.
    require_columns(
        emscad,
        EMSCAD_TEXT_COLUMNS + [EMSCAD_TARGET],
        "EMSCAD",
    )
    require_columns(
        phiusiil,
        PHIUSIIL_FEATURES + [PHIUSIIL_TARGET],
        "PhiUSIIL",
    )

    # ----------------------- 5. Prepare EMSCAD -------------------------------
    # Convert missing text cells to empty strings and the target to integers.
    emscad = emscad.dropna(subset=[EMSCAD_TARGET]).copy()
    for column in EMSCAD_TEXT_COLUMNS:
        emscad[column] = emscad[column].fillna("").astype(str)

    X_emscad = emscad[EMSCAD_TEXT_COLUMNS].copy()
    y_emscad = pd.to_numeric(emscad[EMSCAD_TARGET], errors="raise").astype(int)

    if set(y_emscad.unique()) != {0, 1}:
        raise ValueError(
            f"EMSCAD target '{EMSCAD_TARGET}' should contain labels 0 and 1; "
            f"found {sorted(y_emscad.unique())}"
        )

    # ----------------------- 6. Prepare PhiUSIIL -----------------------------
    phiusiil = phiusiil.dropna(subset=[PHIUSIIL_TARGET]).copy()
    raw_labels = pd.to_numeric(phiusiil[PHIUSIIL_TARGET], errors="raise")

    # Map source labels to positive=phishing, negative=legitimate.
    label_map = {
        PHIUSIIL_LEGITIMATE_SOURCE_VALUE: 0,
        PHIUSIIL_PHISHING_SOURCE_VALUE: 1,
    }
    if not set(raw_labels.unique()).issubset(set(label_map.keys())):
        raise ValueError(
            f"Unexpected values in PhiUSIIL target '{PHIUSIIL_TARGET}': "
            f"{sorted(raw_labels.unique())}. Verify the label mapping."
        )

    y_phiusiil = raw_labels.map(label_map).astype(int)
    X_phiusiil = phiusiil[PHIUSIIL_FEATURES].copy()

    # Ensure feature columns are numeric; values that cannot be parsed become NaN
    # and are handled by the median imputer fitted on the training set.
    for column in PHIUSIIL_FEATURES:
        X_phiusiil[column] = pd.to_numeric(X_phiusiil[column], errors="coerce")

    # ----------------------- 7. Train selected models ------------------------

    results = []

    # Pipeline 1: EMSCAD text features + Logistic Regression.
    emscad_model = LogisticRegression(
        max_iter=2000,
        class_weight=None,
        solver="liblinear",
        random_state=RANDOM_STATE,
    )
    results.append(
        train_and_evaluate(
            "EMSCAD",
            "TF-IDF + Logistic Regression",
            X_emscad,
            y_emscad,
            emscad_model,
            text_mode=True,
            text_columns=EMSCAD_TEXT_COLUMNS,
        )
    )

    # Pipeline 2: PhiUSIIL URL features + HistGradientBoosting.
    hgb_model = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.1,
        max_leaf_nodes=31,
        random_state=RANDOM_STATE,
    )
    results.append(
        train_and_evaluate(
            "PhiUSIIL",
            "18 URL features + HistGradientBoosting",
            X_phiusiil,
            y_phiusiil,
            hgb_model,
            numeric_columns=PHIUSIIL_FEATURES,
        )
    )

    # Pipeline 3: PhiUSIIL URL features + Logistic Regression.
    url_lr_model = LogisticRegression(
        max_iter=2000,
        class_weight=None,
        solver="lbfgs",
        random_state=RANDOM_STATE,
    )
    results.append(
        train_and_evaluate(
            "PhiUSIIL",
            "18 URL features + Logistic Regression",
            X_phiusiil,
            y_phiusiil,
            url_lr_model,
            numeric_columns=PHIUSIIL_FEATURES,
        )
    )

    # ----------------------- 8. Print and save results -----------------------

    results_df = pd.DataFrame(results)
    results_df["Train"] = results_df["Train"].map(lambda n: f"{n:,}")
    results_df["Test"] = results_df["Test"].map(lambda n: f"{n:,}")

    metric_columns = ["Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]
    for column in metric_columns:
        results_df[column] = results_df[column].map(lambda value: f"{value:.2f}%")

    print("\n" + "=" * 140)
    print("FINAL MEASURED RESULTS (70:30 SPLIT)")
    print("=" * 140)
    print(results_df.to_string(index=False))

    csv_path = os.path.join(OUTPUT_DIR, "JobGuard_Results_70_30.csv")
    results_df.to_csv(csv_path, index=False)
    print(f"\nResults CSV saved to: {os.path.abspath(csv_path)}")

    # Keep numerical values for plots.
    numeric_results = pd.DataFrame(results)
    create_four_graphs(numeric_results, OUTPUT_DIR)

    print("\nAll tasks completed.")
    print(f"Check the output folder: {os.path.abspath(OUTPUT_DIR)}")


# --------------------------- 9. Create four graphs --------------------------

def create_four_graphs(results_df, output_dir):
    """Generate bar, scatter, line, and box plots from the measured model scores."""
    metrics = ["Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]
    short_names = [
        "EMSCAD\nTF-IDF + Logistic\nRegression",
        "PhiUSIIL\nURL + HistGradientBoosting",
        "PhiUSIIL\nURL + Logistic Regression",
    ]
    colors = ["#65764A", "#4F7C78", "#A7A9AC", "#C9B77D", "#6D7895"]
    model_colors = ["#65764A", "#4F7C78", "#A7A9AC"]

    # Graph 1: grouped bar chart comparing all five metrics.
    fig, ax = plt.subplots(figsize=(13, 7), dpi=180)
    x = np.arange(len(results_df))
    width = 0.15

    for index, metric in enumerate(metrics):
        values = results_df[metric].to_numpy()
        bars = ax.bar(
            x + (index - 2) * width,
            values,
            width,
            label=metric,
            color=colors[index],
        )
        for bar, value in zip(bars, values):
            ax.annotate(
                f"{value:.2f}",
                (bar.get_x() + bar.get_width() / 2, value),
                xytext=(0, 3),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=7,
                rotation=90,
            )

    ax.set_xticks(x)
    ax.set_xticklabels(short_names, fontsize=9)
    ax.set_ylim(0, 105)
    ax.set_ylabel("Score (%)")
    ax.set_title("JobGuard AI - 70:30 Performance Comparison", fontsize=15, weight="bold")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.legend(ncol=5, loc="lower center", bbox_to_anchor=(0.5, -0.23), frameon=False)
    fig.text(
        0.01, 0.01,
        "Higher scores are generally better; recall is especially important for detecting positive scam/phishing cases.",
        fontsize=9,
    )
    fig.tight_layout(rect=[0, 0.07, 1, 1])
    fig.savefig(os.path.join(output_dir, "1_Bar_Chart.png"), bbox_inches="tight")
    plt.close(fig)

    # Graph 2: scatter plot comparing precision and recall.
    fig, ax = plt.subplots(figsize=(10, 7), dpi=180)
    for index, row in results_df.iterrows():
        ax.scatter(
            row["Recall"],
            row["Precision"],
            s=180,
            color=model_colors[index],
            edgecolor="#333333",
            linewidth=0.8,
            label=row["Pipeline"],
        )
        ax.annotate(
            f'{row["Precision"]:.2f}% precision\n{row["Recall"]:.2f}% recall',
            (row["Recall"], row["Precision"]),
            xytext=(8, -25 if index == 0 else 8),
            textcoords="offset points",
            fontsize=8,
        )

    ax.set_xlabel("Recall (%)")
    ax.set_ylabel("Precision (%)")
    ax.set_title("Precision vs Recall (70:30 Split)", fontsize=15, weight="bold")
    ax.grid(True, linestyle="--", alpha=0.35)
    ax.legend(loc="best", fontsize=8)
    fig.text(
        0.01, 0.01,
        "A model nearer the upper-right has a stronger precision-recall balance.",
        fontsize=9,
    )
    fig.tight_layout(rect=[0, 0.05, 1, 1])
    fig.savefig(os.path.join(output_dir, "2_Scatter_Plot.png"), bbox_inches="tight")
    plt.close(fig)

    # Graph 3: line chart showing the metric profile of each pipeline.
    fig, ax = plt.subplots(figsize=(12, 7), dpi=180)
    for index, row in results_df.iterrows():
        values = [row[metric] for metric in metrics]
        ax.plot(
            metrics,
            values,
            marker="o",
            linewidth=2.4,
            markersize=8,
            color=model_colors[index],
            label=row["Pipeline"],
        )
        for metric_index, value in enumerate(values):
            ax.annotate(
                f"{value:.2f}",
                (metric_index, value),
                textcoords="offset points",
                xytext=(0, 8),
                ha="center",
                fontsize=8,
            )

    ax.set_ylim(0, 105)
    ax.set_ylabel("Score (%)")
    ax.set_title("Metric Profile by Pipeline (70:30 Split)", fontsize=15, weight="bold")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.24), fontsize=8, frameon=False)
    fig.text(0.01, 0.01, "Each line represents one model pipeline.", fontsize=9)
    fig.tight_layout(rect=[0, 0.07, 1, 1])
    fig.savefig(os.path.join(output_dir, "3_Line_Chart.png"), bbox_inches="tight")
    plt.close(fig)

    # Graph 4: larger box plot. The boxes summarize five different metrics per model.
    # This is descriptive only; the values are not repeated trials.
    box_data = [
        [float(row[metric]) for metric in metrics]
        for _, row in results_df.iterrows()
    ]
    fig, ax = plt.subplots(figsize=(14, 9), dpi=200)
    boxplot = ax.boxplot(
        box_data,
        patch_artist=True,
        widths=0.58,
        showmeans=True,
        medianprops=dict(color="#333333", linewidth=2.2),
        meanprops=dict(
            marker="D",
            markerfacecolor="#333333",
            markeredgecolor="#333333",
            markersize=7,
        ),
        whiskerprops=dict(color="#555555", linewidth=1.6),
        capprops=dict(color="#555555", linewidth=1.6),
    )

    for patch, color in zip(boxplot["boxes"], model_colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.85)

    ax.set_xticks([1, 2, 3])
    ax.set_xticklabels(short_names, fontsize=10)
    ax.set_ylabel("Metric score (%)", fontsize=12)
    ax.set_ylim(0, 105)
    ax.set_title(
        "Expanded Box Plot of Metric Scores by Pipeline (70:30 Split)",
        fontsize=16,
        weight="bold",
        pad=18,
    )
    ax.grid(axis="y", linestyle="--", alpha=0.35)

    fig.text(
        0.06, 0.025,
        "How to read: each box summarizes the five metric scores for one pipeline. "
        "The horizontal line is the median, the diamond is the mean, and the whiskers show the plotted spread. "
        "These are five different metrics from one split, not repeated experimental trials; "
        "therefore, the box plot is descriptive and is not a confidence interval or significance test.",
        fontsize=9,
        wrap=True,
    )
    fig.tight_layout(rect=[0, 0.12, 1, 1])
    fig.savefig(
        os.path.join(output_dir, "4_Large_Box_Plot.png"),
        bbox_inches="tight",
    )
    plt.close(fig)

    print("\nFour graphs saved:")
    print(f"  {os.path.abspath(os.path.join(output_dir, '1_Bar_Chart.png'))}")
    print(f"  {os.path.abspath(os.path.join(output_dir, '2_Scatter_Plot.png'))}")
    print(f"  {os.path.abspath(os.path.join(output_dir, '3_Line_Chart.png'))}")
    print(f"  {os.path.abspath(os.path.join(output_dir, '4_Large_Box_Plot.png'))}")


# --------------------------- 10. Run the program ----------------------------

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("\nERROR:", error)
        print(
            "\nCheck the dataset paths, column names, target label mapping, and installed packages."
        )
        sys.exit(1)
