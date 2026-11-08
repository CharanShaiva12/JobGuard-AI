"""
JobGuard AI - Performance Evaluation
Pipelines:
1. EMSCAD: TF-IDF + Logistic Regression
2. PhiUSIIL: 18 URL features + HistGradientBoostingClassifier

The combined table is a macro-average of the two pipelines' scores. It is NOT a third
model trained on a merged dataset, because the datasets represent different tasks.

Put this script and both CSV datasets in the same folder, then run:
    python jobguard_performance.py
"""

from pathlib import Path
import time
import warnings
import subprocess
import shutil

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
)
from sklearn.metrics import confusion_matrix

warnings.filterwarnings("ignore")

# -------------------------- SETTINGS --------------------------

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "JobGuard_Results"
OUTPUT_DIR.mkdir(exist_ok=True)

SPLITS = [(90, 10), (80, 20), (70, 30), (60, 40), (50, 50)]
RANDOM_STATE = 42

EMSCAD_CANDIDATES = [
    "fake_job_postings.csv",
    "Fake Postings.csv",
    "emscad.csv",
    "EMSCAD.csv",
]
PHIUSIIL_CANDIDATES = [
    "PhiUSIIL_Phishing_URL_Dataset.csv",
    "phiusiil.csv",
    "PhiUSIIL.csv",
]

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
    """Find a matching CSV in the script folder; otherwise ask for its path."""
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
    return {
        "Accuracy": accuracy_score(y_true, y_pred),
        "Precision": precision_score(y_true, y_pred, zero_division=0),
        "Recall": recall_score(y_true, y_pred, zero_division=0),
        "F1-score": f1_score(y_true, y_pred, zero_division=0),
        "ROC-AUC": roc_auc_score(y_true, y_prob),
    }


def run_emscad(path):
    print("\n" + "=" * 68)
    print("EMSCAD: TF-IDF + Logistic Regression")
    print("=" * 68)
    df = pd.read_csv(path)

    missing_columns = [c for c in TEXT_COLUMNS + ["fraudulent"] if c not in df.columns]
    if missing_columns:
        raise ValueError(
            f"EMSCAD file is missing columns {missing_columns}. "
            "Use the original EMSCAD fake_job_postings.csv with a 'fraudulent' column."
        )

    for col in TEXT_COLUMNS:
        df[col] = df[col].fillna("").astype(str)

    # Positive class = fraudulent job posting (1).
    y = pd.to_numeric(df["fraudulent"], errors="coerce")
    valid = y.isin([0, 1])
    df = df.loc[valid].copy()
    y = y.loc[valid].astype(int)
    if y.nunique() != 2:
        raise ValueError(
            "The EMSCAD file must contain BOTH fraudulent=1 and legitimate=0 records. "
            "The selected file has only one class or an invalid target column."
        )

    text = df[TEXT_COLUMNS].agg(" ".join, axis=1)
    rows = []

    for train_pct, test_pct in SPLITS:
        split_name = f"{train_pct}:{test_pct}"
        print(f"Running EMSCAD split {split_name} ...")

        x_train_text, x_test_text, y_train, y_test = train_test_split(
            text, y, test_size=test_pct / 100,
            random_state=RANDOM_STATE, stratify=y
        )

        # Fit TF-IDF on training text only to avoid test-data leakage.
        vectorizer = TfidfVectorizer(
            max_features=12000,
            sublinear_tf=True,
            ngram_range=(1, 2),
            stop_words="english"
        )
        x_train = vectorizer.fit_transform(x_train_text)
        x_test = vectorizer.transform(x_test_text)

        model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
        started = time.time()
        model.fit(x_train, y_train)
        fit_seconds = time.time() - started

        y_pred = model.predict(x_test)
        positive_index = list(model.classes_).index(1)
        y_prob = model.predict_proba(x_test)[:, positive_index]
        scores = get_scores(y_test, y_pred, y_prob)


        cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
        



        rows.append({
            "Dataset": "EMSCAD",
            "Pipeline": "TF-IDF + Logistic Regression",
            "Split": split_name,
            "Train %": train_pct,
            "Test %": test_pct,
            "Train n": len(y_train),
            "Test n": len(y_test),
            **scores,
            "Fit seconds": round(fit_seconds, 3),
            "Feature count": x_train.shape[1]
        })

    return rows


def run_phiusiil(path):
    print("\n" + "=" * 68)
    print("PhiUSIIL: 18 URL features + HistGradientBoostingClassifier")
    print("=" * 68)

    required = URL_FEATURES + ["label"]
    df = pd.read_csv(path, usecols=required)
    df = df.dropna(subset=["label"]).copy()

    for col in URL_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[URL_FEATURES] = (
        df[URL_FEATURES]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )

    original_labels = pd.to_numeric(df["label"], errors="coerce")
    valid = original_labels.isin([0, 1])
    df = df.loc[valid].copy()
    original_labels = original_labels.loc[valid].astype(int)

    # PhiUSIIL original label 0 = phishing, label 1 = legitimate.
    # Convert phishing to positive class 1 for the metrics.
    y = (original_labels == 0).astype(int)
    if y.nunique() != 2:
        raise ValueError("PhiUSIIL must contain both phishing and legitimate labels.")

    X = df[URL_FEATURES]
    rows = []

    for train_pct, test_pct in SPLITS:
        split_name = f"{train_pct}:{test_pct}"
        print(f"Running PhiUSIIL split {split_name} ...")

        x_train, x_test, y_train, y_test = train_test_split(
            X, y, test_size=test_pct / 100,
            random_state=RANDOM_STATE, stratify=y
        )

        model = HistGradientBoostingClassifier(random_state=RANDOM_STATE)
        started = time.time()
        model.fit(x_train, y_train)
        fit_seconds = time.time() - started

        y_pred = model.predict(x_test)
        positive_index = list(model.classes_).index(1)
        y_prob = model.predict_proba(x_test)[:, positive_index]
        scores = get_scores(y_test, y_pred, y_prob)

        rows.append({
            "Dataset": "PhiUSIIL",
            "Pipeline": "18 URL features + HistGradientBoostingClassifier",
            "Split": split_name,
            "Train %": train_pct,
            "Test %": test_pct,
            "Train n": len(y_train),
            "Test n": len(y_test),
            **scores,
            "Fit seconds": round(fit_seconds, 3),
            "Feature count": len(URL_FEATURES)
        })

    return rows


def make_combined_summary(results):
    """Macro-average scores from the two distinct pipelines, not a trained combined model."""
    df = pd.DataFrame(results)
    emscad = df[df["Dataset"] == "EMSCAD"].set_index("Split")
    phi = df[df["Dataset"] == "PhiUSIIL"].set_index("Split")
    combined_rows = []

    for train_pct, test_pct in SPLITS:
        split = f"{train_pct}:{test_pct}"
        a, b = emscad.loc[split], phi.loc[split]
        row = {
            "Dataset": "Combined macro-average (not a trained model)",
            "Pipeline": "Arithmetic mean of EMSCAD and PhiUSIIL scores",
            "Split": split,
            "Train %": train_pct,
            "Test %": test_pct,
            "Train n": int(a["Train n"] + b["Train n"]),
            "Test n": int(a["Test n"] + b["Test n"]),
            "Fit seconds": np.nan,
            "Feature count": np.nan,
        }
        for metric in METRICS:
            row[metric] = (float(a[metric]) + float(b[metric])) / 2
        combined_rows.append(row)
    return combined_rows


def save_graphs(results_df):
    # Only two actual model pipelines plus a clearly labeled macro-average summary.
    graph_df = results_df.copy()
    graph_df["Train %"] = pd.to_numeric(graph_df["Train %"])
    graph_df["F1 %"] = graph_df["F1-score"] * 100
    graph_df["ROC-AUC %"] = graph_df["ROC-AUC"] * 100
    graph_df["Accuracy %"] = graph_df["Accuracy"] * 100
    graph_df["Precision %"] = graph_df["Precision"] * 100
    graph_df["Recall %"] = graph_df["Recall"] * 100

    labels = [
        "EMSCAD — TF-IDF + Logistic Regression",
        "PhiUSIIL — URL features + HistGradientBoosting",
        "Combined macro-average (not a trained model)"
    ]
    frames = {}
    for label, dataset in zip(labels, [
        "EMSCAD", "PhiUSIIL", "Combined macro-average (not a trained model)"
    ]):
        frames[label] = graph_df[graph_df["Dataset"] == dataset].copy()

    colors = ["#6F7652", "#B66A4A", "#777777"]
    train_order = [50, 60, 70, 80, 90]

    # 1. Scatter plot
    fig, ax = plt.subplots(figsize=(9, 5.6))
    for (label, frame), color in zip(frames.items(), colors):
        frame = frame.sort_values("Train %")
        ax.scatter(frame["Train %"], frame["F1 %"], s=65, label=label, color=color)
        for _, row in frame.iterrows():
            ax.annotate(row["Split"], (row["Train %"], row["F1 %"]),
                        xytext=(3, 4), textcoords="offset points", fontsize=7)
    ax.set_title("F1-score by Training Proportion")
    ax.set_xlabel("Training data (%)")
    ax.set_ylabel("F1-score (%)")
    ax.set_xticks(train_order)
    ax.grid(True, alpha=0.25)
    ax.legend(fontsize=7, frameon=False)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "01_scatter_f1.png", dpi=220, bbox_inches="tight")
    plt.close(fig)

    # 2. Grouped bar chart: mean metrics across the five splits.
    fig, ax = plt.subplots(figsize=(10, 5.8))
    x = np.arange(len(METRICS))
    width = 0.25
    for idx, ((label, frame), color) in enumerate(zip(frames.items(), colors)):
        means = [frame[m].mean() * 100 for m in METRICS]
        ax.bar(x + (idx - 1) * width, means, width, label=label, color=color)
    ax.set_title("Mean Performance Metrics Across Five Splits")
    ax.set_xlabel("Evaluation metric")
    ax.set_ylabel("Mean score (%)")
    ax.set_xticks(x)
    ax.set_xticklabels(METRICS)
    ax.set_ylim(0, 100)
    ax.grid(axis="y", alpha=0.25)
    ax.legend(fontsize=7, frameon=False)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "02_bar_mean_metrics.png", dpi=220, bbox_inches="tight")
    plt.close(fig)

    # 3. Line graph: F1 and ROC-AUC trends.
    fig, ax = plt.subplots(figsize=(10, 5.8))
    for (label, frame), color in zip(frames.items(), colors):
        frame = frame.sort_values("Train %")
        ax.plot(frame["Train %"], frame["F1 %"], marker="o", linewidth=1.6,
                label=f"{label}: F1", color=color)
        ax.plot(frame["Train %"], frame["ROC-AUC %"], marker="s", linestyle="--",
                linewidth=1.3, label=f"{label}: ROC-AUC", color=color, alpha=0.8)
    ax.set_title("F1-score and ROC-AUC by Training Proportion")
    ax.set_xlabel("Training data (%)")
    ax.set_ylabel("Score (%)")
    ax.set_xticks(train_order)
    ax.grid(True, alpha=0.25)
    ax.legend(fontsize=6.5, frameon=False, ncol=2)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "03_line_metrics.png", dpi=220, bbox_inches="tight")
    plt.close(fig)


def save_word_report(results_df):
    """Create a DOCX report, if python-docx is installed."""
    try:
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
    except ImportError:
        print("python-docx not installed; skipping Word report.")
        return None

    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    doc.styles["Normal"].font.name = "Times New Roman"
    doc.styles["Normal"].font.size = Pt(10.5)
    doc.styles["Heading 1"].font.color.rgb = RGBColor(111, 118, 82)

    title = doc.add_heading("JobGuard AI — Performance Evaluation Report", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p = doc.add_paragraph(
        "Pipelines evaluated: EMSCAD (TF-IDF + Logistic Regression) and PhiUSIIL "
        "(18 URL features + HistGradientBoostingClassifier)."
    )
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    doc.add_paragraph(
        "Evaluation uses held-out test data at 90:10, 80:20, 70:30, 60:40 and 50:50 splits. "
        "The combined table is a macro-average summary of the two different pipelines, not a model trained "
        "on merged data."
    )

    def add_result_table(title_text, dataset_name):
        doc.add_heading(title_text, level=1)
        frame = results_df[results_df["Dataset"] == dataset_name].copy()
        headers = ["Split", "Train n", "Test n", "Accuracy", "Precision", "Recall", "F1-score", "ROC-AUC"]
        table = doc.add_table(rows=1, cols=len(headers))
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for j, h in enumerate(headers):
            table.rows[0].cells[j].text = h
        for split in [f"{a}:{b}" for a, b in SPLITS]:
            row_data = frame[frame["Split"] == split].iloc[0]
            cells = table.add_row().cells
            values = [
                split, f'{int(row_data["Train n"]):,}', f'{int(row_data["Test n"]):,}',
                *[f'{row_data[m]*100:.2f}%' for m in METRICS]
            ]
            for j, value in enumerate(values):
                cells[j].text = value
        for ri, row in enumerate(table.rows):
            for cell in row.cells:
                cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                for para in cell.paragraphs:
                    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    for run in para.runs:
                        run.font.name = "Times New Roman"
                        run.font.size = Pt(8)
                        if ri == 0:
                            run.font.bold = True
                            run.font.color.rgb = RGBColor(255, 255, 255)
                if ri == 0:
                    tcPr = cell._tc.get_or_add_tcPr()
                    shd = OxmlElement("w:shd")
                    shd.set(qn("w:fill"), "6F7652")
                    tcPr.append(shd)

    add_result_table("EMSCAD — TF-IDF + Logistic Regression", "EMSCAD")
    add_result_table("PhiUSIIL — URL Features + HistGradientBoosting", "PhiUSIIL")
    add_result_table("Combined Results — Macro-Average Summary", "Combined macro-average (not a trained model)")

    doc.add_heading("Performance Graphs", level=1)
    for caption, image_name in [
        ("Figure 1. F1-score by training proportion.", "01_scatter_f1.png"),
        ("Figure 2. Mean metrics across the five splits.", "02_bar_mean_metrics.png"),
        ("Figure 3. F1-score and ROC-AUC trends.", "03_line_metrics.png"),
    ]:
        para = doc.add_paragraph(caption)
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        doc.add_picture(str(OUTPUT_DIR / image_name), width=Inches(6.1))

    doc.add_heading("Interpretation and Limitations", level=1)
    doc.add_paragraph(
        "EMSCAD measures fraudulent job-posting detection; PhiUSIIL measures phishing URL detection. "
        "Their macro-average is a descriptive summary only. It is not evidence of a third classifier trained "
        "on a combined dataset. Standalone rule-engine metrics require labelled test records and saved rule predictions."
    )
    output_docx = OUTPUT_DIR / "JobGuard_Performance_Report.docx"
    doc.save(output_docx)
    return output_docx


def main():
    print("\nJOBGUARD AI PERFORMANCE EVALUATION")
    print("This script will train both pipelines across five train/test splits.")
    print("Training may take several minutes, especially for PhiUSIIL.\n")

    emscad_path = find_dataset(
        EMSCAD_CANDIDATES,
        ["title", "company_profile", "description", "requirements", "benefits", "fraudulent"],
        "EMSCAD job-posting dataset"
    )
    phi_path = find_dataset(
        PHIUSIIL_CANDIDATES,
        URL_FEATURES + ["label"],
        "PhiUSIIL phishing URL dataset"
    )

    results = []
    results.extend(run_emscad(emscad_path))
    results.extend(run_phiusiil(phi_path))
    results.extend(make_combined_summary(results))

    results_df = pd.DataFrame(results)
    csv_path = OUTPUT_DIR / "JobGuard_Measured_Results.csv"
    results_df.to_csv(csv_path, index=False)

    print("\n" + "=" * 100)
    print("MEASURED RESULTS (scores are percentages)")
    print("=" * 100)
    for dataset in [
        "EMSCAD", "PhiUSIIL", "Combined macro-average (not a trained model)"
    ]:
        print(f"\n{dataset}")
        frame = results_df[results_df["Dataset"] == dataset]
        display = frame[["Split", "Train n", "Test n"] + METRICS].copy()
        for metric in METRICS:
            display[metric] = (display[metric] * 100).map(lambda v: f"{v:.2f}%")
        print(display.to_string(index=False))

    print("\nCreating graphs...")
    save_graphs(results_df)

    print("Creating Word report...")
    report_path = save_word_report(results_df)

    print("\nDONE. Output files saved in:")
    print(OUTPUT_DIR)
    print("- JobGuard_Measured_Results.csv")
    print("- 01_scatter_f1.png")
    print("- 02_bar_mean_metrics.png")
    print("- 03_line_metrics.png")
    if report_path:
        print(f"- {report_path.name}")

    lo = shutil.which("libreoffice") or shutil.which("soffice")
    if report_path and lo:
        try:
            subprocess.run(
                [lo, "--headless", "--convert-to", "pdf", "--outdir", str(OUTPUT_DIR), str(report_path)],
                check=True, capture_output=True, text=True, timeout=120
            )
            pdf_path = OUTPUT_DIR / "JobGuard_Performance_Report.pdf"
            if pdf_path.exists():
                print(f"- {pdf_path.name}")
        except Exception as exc:
            print(f"PDF conversion skipped. Open the DOCX in Word and export to PDF. Details: {exc}")
    elif report_path:
        print("To make a PDF, open the generated DOCX in Word and choose Save As/Export to PDF.")

    print("\nNote: Combined results are the arithmetic mean of the two pipelines' scores, not a trained combined model.")


if __name__ == "__main__":
    main()
