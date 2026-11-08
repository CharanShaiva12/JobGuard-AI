# JobGuard AI — Machine Learning Evaluation & Benchmark Report

## 1. Experimental Methodology
In compliance with the project's academic synopsis and SRS specifications, two independent supervised machine learning pipelines were trained and evaluated on held-out stratified 70:30 splits:
1. **EMSCAD Pipeline:** Online recruitment fraud detection using textual features (Title, Company Profile, Description, Requirements, Benefits) converted to sublinear TF-IDF features and classified using Logistic Regression with balanced class weights.
2. **PhiUSIIL Pipeline:** Phishing and deceptive URL detection using 18 structural and lexical features classified using XGBoost (`XGBClassifier`) and a Logistic Regression baseline.

> **CRITICAL ARCHITECTURAL PRINCIPLE:**
> The two datasets are **NOT merged** into a single classifier because they evaluate distinct input domains and target variables. Any arithmetic mean of metrics is purely a descriptive summary across separate feature spaces.

---

## 2. Official Measured 70:30 Split Results

### 2.1 EMSCAD Text Classification Pipeline
- **Dataset:** Employment Scam Aegean Dataset (EMSCAD / `fake_job_postings.csv`)
- **Total Records:** 17,880 (17,014 Legitimate [0], 866 Fraudulent [1])
- **Train Split (70%):** 12,516 records
- **Test Split (30% held-out):** 5,364 records (5,104 Legitimate, 260 Fraudulent)
- **Feature Extraction:** Sublinear TF-IDF with (1, 2) word n-grams, 12,000 maximum vocabulary dimensions
- **Classifier:** Logistic Regression (balanced class weight, max_iter=1000)

| Metric | Measured Value | Notes |
|---|---|---|
| **Accuracy** | **97.67%** | High overall classification rate |
| **Precision** | **70.52%** | Correctness of flagged fraud postings |
| **Recall** | **89.23%** | High capture rate of actual fraud attempts |
| **F1-Score** | **78.78%** | Harmonic balance between precision and recall |
| **ROC-AUC** | **98.83%** | Outstanding ranking discrimination |
| **Confusion Matrix** | `[TN=5007, FP=97, FN=28, TP=232]` | Only 28 false negatives out of 260 fraud postings |

---

### 2.2 PhiUSIIL URL Threat Classification Pipeline
- **Dataset:** PhiUSIIL Phishing URL Dataset (`PhiUSIIL_Phishing_URL_Dataset.csv`)
- **Total Records:** 235,795 (134,850 Legitimate [mapped to 0], 100,945 Phishing [mapped to 1])
- **Train Split (70%):** 165,056 records
- **Test Split (30% held-out):** 70,739 records (40,455 Legitimate, 30,284 Phishing)
- **Features Extracted:** Exactly 18 numerical lexical & structural features:
  1. `URLLength`
  2. `DomainLength`
  3. `IsDomainIP`
  4. `TLDLength`
  5. `NoOfSubDomain`
  6. `HasObfuscation`
  7. `NoOfObfuscatedChar`
  8. `ObfuscationRatio`
  9. `NoOfLettersInURL`
  10. `LetterRatioInURL`
  11. `NoOfDegitsInURL`
  12. `DegitRatioInURL`
  13. `NoOfEqualsInURL`
  14. `NoOfQMarkInURL`
  15. `NoOfAmpersandInURL`
  16. `NoOfOtherSpecialCharsInURL`
  17. `SpacialCharRatioInURL`
  18. `IsHTTPS`

#### Evaluated URL Models:
| Metric | XGBoost (`XGBClassifier`) | Logistic Regression (Baseline) |
|---|---|---|
| **Accuracy** | **99.69%** | **99.77%** |
| **Precision** | **99.96%** | **99.99%** |
| **Recall** | **99.32%** | **99.46%** |
| **F1-Score** | **99.64%** | **99.73%** |
| **ROC-AUC** | **99.87%** | **99.86%** |
| **Inference Fit Time** | 2.05 seconds | 0.53 seconds |
| **Confusion Matrix** | `[TN=40442, FP=13, FN=206, TP=30078]` | `[TN=40453, FP=2, FN=164, TP=30120]` |

---

## 3. Data Integrity & Leakage Prevention Rules
1. Vectorizers and scalers are fitted exclusively on the 70% training subset (`x_train`).
2. The 30% testing subset (`x_test`) is held out until final scoring.
3. Original source files in `reference/` and `data/raw/` are read-only and preserved permanently.
