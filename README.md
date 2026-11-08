# JobGuard AI — AI-Assisted Job Scam Detection & Risk Assessment Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B%20%7C%20v22%20%7C%20v26-brightgreen)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-teal)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.4%20LTS-orange)](https://www.mysql.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple)](https://vitejs.dev/)

> **JobGuard AI** is a multi-layered cybersecurity, digital forensics, and machine-learning-powered risk assessment platform engineered to protect job seekers, recent graduates, and students from fraudulent recruitment solicitations, deceptive employment portals, identity-harvesting campaigns, and advance-fee employment scams.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [Key Features](#4-key-features)
5. [Supported Input Types](#5-supported-input-types)
6. [System Architecture](#6-system-architecture)
7. [Technology Stack](#7-technology-stack)
8. [Algorithms Implemented](#8-algorithms-implemented)
9. [Machine Learning Workflow](#9-machine-learning-workflow)
10. [Dataset Descriptions and Attribution](#10-dataset-descriptions-and-attribution)
11. [Model Evaluation Results](#11-model-evaluation-results)
12. [Backend Architecture](#12-backend-architecture)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Database Design](#14-database-design)
15. [Installation Requirements](#15-installation-requirements)
16. [Local Setup Instructions](#16-local-setup-instructions)
17. [Environment Variable Configuration](#17-environment-variable-configuration)
18. [Database Setup](#18-database-setup)
19. [How to Start the Application](#19-how-to-start-the-application)
20. [Testing Instructions](#20-testing-instructions)
21. [Security Considerations](#21-security-considerations)
22. [Current Limitations](#22-current-limitations)
23. [Future Enhancements](#23-future-enhancements)
24. [Project Directory Structure](#24-project-directory-structure)
25. [License and Acknowledgements](#25-license-and-acknowledgements)

---

## 1. Project Overview

JobGuard AI provides an enterprise-grade, explainable cybersecurity assessment system that evaluates employment offers across multiple forensic dimensions. The platform combines deterministic pattern heuristics, trained natural language processing classifiers, passive lexical URL analyzers, and contextual generative AI reasoning into a unified consensus risk engine.

The platform is designed to operate seamlessly in both online mode (leveraging Google Gemini for real-time live company grounding) and standalone offline mode (relying on local scikit-learn, XGBoost models, and deterministic heuristics).

---

## 2. Problem Statement

Recruitment fraud has escalated significantly across online platforms including LinkedIn, Telegram, WhatsApp, and job boards. Malicious actors impersonate reputable enterprises, deploy lookalike phishing portals, and demand advance fees for "mandatory onboarding kits", "background verification", or "equipment deposits". 

Traditional anti-phishing filters and generic antivirus tools frequently fail to detect recruitment scams because fraudulent postings often use legitimate hosting providers (e.g., Google Forms, Notion, Typeform) or mimic genuine job descriptions without containing traditional binary malware. Job seekers require a specialized, multi-stream forensic analyzer that inspects recruitment-specific indicators alongside domain topology.

---

## 3. Objectives

- **Multi-Vector Threat Detection:** Analyze job listings through textual semantics, URL structural topology, domain reputation, and employer identity.
- **Explainable Forensic Scoring:** Provide transparent, point-by-point evidence breakdown rather than opaque black-box verdicts.
- **Privacy & Safety by Design:** Perform passive lexical URL inspection without executing untrusted external JavaScript or initiating unsafe crawler requests.
- **Resilient Multi-Engine Consensus:** Synthesize rule heuristics, NLP models, tree-based classifiers, and LLM reasoning with fail-safe weight rebalancing.
- **Accessible User Experience:** Deliver an intuitive, Apple-inspired interface with responsive controls, dark/light themes, and exportable forensic dossiers (PDF & DOCX).

---

## 4. Key Features

- **Four Independent Analysis Modes:** Support for URLs, raw pasted messages, corporate domain verification, and document/screenshot uploads.
- **18-Rule Deterministic Heuristic Engine ($H$):** Identifies high-risk phrases (advance training fees, security deposits, crypto payments, WhatsApp-only interviews).
- **Sublinear TF-IDF Text Classification ($M$):** Classifies job text using 12,000 n-gram features and calibrated balanced Logistic Regression.
- **18-Feature Lexical URL Classifier ($U$):** Evaluates domain topology, Shannon entropy, obfuscation ratios, and special character distributions using an XGBoost classifier.
- **Contextual Forensic AI ($G$):** Integrates Google Gemini (`gemini-3.5-flash-lite`) with search grounding to verify employer legitimacy and open vacancies.
- **Dual Server-Side CAPTCHA:** Cryptographic nonce challenge enforced on both user registration and login to defeat automated bot traffic.
- **SSRF Protection:** Multi-layer IP validation blocking access to loopback, private RFC-1918 ranges, link-local, and cloud metadata addresses.
- **Forensic Dossier Export:** Instant generation of forensic PDF and Microsoft Word (.docx) compliance reports.
- **User Preference & Theme Engine:** 10 curated themes (e.g., Cupertino, Cyber Sentinel, Nordic Frost) with persistent cookie consent controls.

---

## 5. Supported Input Types

| Mode | Input Type | Processing Pipeline | Primary Use Case |
|---|---|---|---|
| **Mode 1** | **Job / Application URL** | Lexical feature extraction (18 PhiUSIIL features) + Threat Intel Cache + XGBoost classifier | Recruiter application links, external job boards, Google Forms |
| **Mode 2** | **Pasted Recruitment Text** | Heuristic entity extraction + Sublinear TF-IDF + Logistic Regression NLP + Gemini reasoning | Unsolicited messages on WhatsApp, Telegram, LinkedIn InMail, SMS |
| **Mode 3** | **Independent Company Verification** | Domain lookup + Known ATS directory matching (Greenhouse, Lever, Workday) + Search grounding | Validating whether an entity actively hires through standard channels |
| **Mode 4** | **Document & Screenshot OCR** | PDF-Parse / Mammoth (.docx) / Gemini Vision OCR text extraction -> Multi-stream pipeline | Formal offer letters, appointment PDFs, screenshot captures |

---

## 6. System Architecture

```
                                 [ Web Browser Client ]
                                           |
                                           v  (Port 5173)
                             [ React 18 + Vite Frontend ]
                                           |
                    +----------------------+----------------------+
                    | (Reverse Proxy /api)                        | (Reverse Proxy /ml)
                    v                                             v
     [ Node.js Express API Gateway ]                [ FastAPI ML Microservice ]
               (Port 5000)                                   (Port 8000)
                    |                                             |
     +--------------+--------------+                +-------------+-------------+
     |              |              |                |                           |
     v              v              v                v                           v
 [MySQL 8.4]   [Rule Engine]  [Gemini AI]   [EMSCAD Text Model]        [PhiUSIIL URL Model]
 (Port 3306)   (18 Heuristics)(Flash-Lite)  (TF-IDF + LogReg)          (18-Feature XGBoost)
```

The system strictly decouples the user-facing application, the orchestration API gateway, and the high-performance ML inference runtime.

---

## 7. Technology Stack

### Frontend
- **Framework:** React 18.3 with TypeScript
- **Bundler & Dev Server:** Vite 6.0
- **Styling:** Tailwind CSS 3.4 with custom theme CSS variables
- **Routing:** React Router DOM v6
- **Data Visualization:** Recharts

### Backend API Gateway
- **Runtime:** Node.js (v20+ / v22 / v26 LTS)
- **Framework:** Express 4.21 with TypeScript
- **Database Driver:** `mysql2/promise` with connection pooling
- **Security:** Helmet, CORS, Express-Rate-Limit, Bcrypt.js, JSONWebToken, Cookie-Parser
- **Document Processing:** PDFKit, Docx, Mammoth, PDF-Parse
- **Validation:** Zod schema validation

### Machine Learning Service
- **Runtime:** Python 3.12
- **Framework:** FastAPI with Uvicorn ASGI server
- **Data Processing:** NumPy, Pandas
- **Model Libraries:** Scikit-learn, XGBoost, Joblib

### Database
- **RDBMS:** MySQL Server 8.4 Community Edition (InnoDB engine, `utf8mb4_unicode_ci`)

### Contextual AI
- **LLM:** Google Gemini API (`@google/genai` with `gemini-3.5-flash-lite`)

---

## 8. Algorithms Implemented

### Multi-Engine Consensus Risk-Fusion Formula
The overall risk score $R \in [0, 100]$ is computed via a weighted consensus formula:

$$R = 100 \times (0.35H + 0.25M + 0.15U + 0.25G)$$

Where:
- **$H$ (35%)**: Deterministic Rule & Heuristic Score (18 recruitment scam indicators).
- **$M$ (25%)**: EMSCAD Text Model Probability (Sublinear TF-IDF + Logistic Regression).
- **$U$ (15%)**: PhiUSIIL 18-Feature URL Model Probability (XGBoost classifier).
- **$G$ (25%)**: Gemini Contextual AI Probability & Public Source Verification.

#### Dynamic Normalization & Fallbacks
When a component is unavailable (e.g., text-only input without a URL, or offline mode without Gemini), the weights are dynamically normalized over the active components:

$$R = 100 \times \frac{\sum_{i \in \text{active}} w_i \cdot S_i}{\sum_{i \in \text{active}} w_i}$$

#### Critical Overrides
- Any confirmed advance-fee demand (e.g., mandatory training kit purchase, crypto deposit) triggers an automatic critical override: $R \ge 85$ (High/Critical Risk).
- Any match against verified malicious domain blacklists triggers an immediate critical override.

---

## 9. Machine Learning Workflow

```
[Raw Dataset] -> [Stratified 70:30 Split] -> [Feature Pipeline] -> [Model Training] -> [Calibrated Artifacts] -> [FastAPI Serving]
```

1. **EMSCAD Text Pipeline:**
   - Text fields (`title`, `company_profile`, `description`, `requirements`, `benefits`) are cleaned, lowercased, and concatenated.
   - Vectorized using sublinear term-frequency TF-IDF with (1, 2) word n-grams up to 12,000 dimensions.
   - Classified using balanced Logistic Regression with L2 regularization (`max_iter=1000`).
   - Serialized as `text_model.joblib` and `vectorizer.joblib`.

2. **PhiUSIIL URL Pipeline:**
   - Parses URLs to extract 18 structural and lexical features (lengths, Shannon entropy, obfuscations, character ratios, digit ratios, IP detection).
   - Classified using XGBoost (`XGBClassifier`) with early stopping and log-loss objective.
   - Baseline compared against Logistic Regression.
   - Serialized as `url_model.joblib` and `url_logreg_model.joblib`.

---

## 10. Dataset Descriptions and Attribution

The machine learning models were developed and evaluated using two established benchmark datasets:

1. **Employment Scam Aegean Dataset (EMSCAD):**
   - **Authors:** S. Vidros, C. Kolias, G. Kambourakis, L. Akoglu (University of the Aegean).
   - **Scope:** 17,880 real-life job advertisements (17,014 legitimate, 866 fraudulent).
   - **Citation:** Vidros, S., et al. *"Automatic Detection of Online Recruitment Frauds: Characteristics, Methods, and a Public Dataset."* Future Internet 9.1 (2017): 6.

2. **PhiUSIIL Phishing URL Dataset:**
   - **Authors:** Arvind Prasad and Shalini Chandra (2024).
   - **Scope:** 235,795 URLs (134,850 legitimate, 100,945 phishing) with extracted lexical and structural features.
   - **Citation:** Prasad, A., & Chandra, S. *"PhiUSIIL: A novel benchmark dataset for phishing detection."* Computers & Security (2024).

> **Note on Raw Datasets:** In accordance with repository management best practices, large raw CSV datasets (~470 MB total) are retained locally for model training and are excluded from the GitHub repository via `.gitignore`. Pre-trained production inference model artifacts (`.joblib`) are tracked in `ml/artifacts/`.

---

## 11. Model Evaluation Results

The models were evaluated using stratified 70% train / 30% test held-out splits.

### 11.1 EMSCAD Text Classification Results (70:30 Split)
- **Train Set:** 12,516 records | **Test Set (Held-Out):** 5,364 records (5,104 legitimate, 260 fraudulent)

| Metric | Measured Value | Notes |
|---|---|---|
| **Accuracy** | **97.67%** | High overall classification accuracy |
| **Precision** | **70.52%** | Precision on minority fraudulent class |
| **Recall** | **89.23%** | Captures ~89% of fraudulent postings |
| **F1-Score** | **78.78%** | Harmonic mean of precision and recall |
| **ROC-AUC** | **98.83%** | Area under the ROC curve |
| **Confusion Matrix** | `TN=5007, FP=97, FN=28, TP=232` | Only 28 false negatives out of 260 scams |

### 11.2 PhiUSIIL URL Threat Classification Results (70:30 Split)
- **Train Set:** 165,056 records | **Test Set (Held-Out):** 70,739 records (40,455 legitimate, 30,284 phishing)

| Metric | XGBoost (`XGBClassifier`) | Logistic Regression (Baseline) |
|---|---|---|
| **Accuracy** | **99.69%** | **99.77%** |
| **Precision** | **99.96%** | **99.99%** |
| **Recall** | **99.32%** | **99.46%** |
| **F1-Score** | **99.64%** | **99.73%** |
| **ROC-AUC** | **99.87%** | **99.86%** |
| **Inference Fit Time** | 2.05 s | 0.53 s |
| **Confusion Matrix** | `TN=40442, FP=13, FN=206, TP=30078` | `TN=40453, FP=2, FN=164, TP=30120` |

*Evaluation Disclaimer: The figures above reflect empirical measurements on held-out academic benchmark test sets. They do not constitute an absolute guarantee of 100% detection on novel, evolving, or zero-day recruitment fraud campaigns.*

---

## 12. Backend Architecture

The Express TypeScript backend provides modular controllers, middleware, and services:

- **`src/app.ts`:** Application factory configuring security middleware, routes, and error handling.
- **`src/server.ts`:** HTTP listener with graceful shutdown handling.
- **`src/config/database.ts`:** MySQL connection pool with parameterized query helpers.
- **`src/config/env.ts`:** Typed environment variable loader with fail-safe defaults.
- **`src/controllers/`:**
  - `auth.controller.ts`: Registration, login, profile, and password management.
  - `captcha.controller.ts`: SVG/algebraic nonce challenge generator.
  - `scan.controller.ts`: Unified endpoint for all 4 scanning modes.
  - `dashboard.controller.ts`: User analytics, threat feed, and system health status.
  - `admin.controller.ts`: User management, audit logs, and feedback verification.
  - `feedback.controller.ts`: User-reported false positive/negative submissions.
- **`src/middleware/`:**
  - `auth.middleware.ts`: JWT verification with HTTP-only cookie support.
  - `ssrf_guard.ts`: Private subnet and loopback protection.
- **`src/services/`:**
  - `risk_fusion.service.ts`: Equation 3.1 consensus risk calculator.
  - `rule_engine.service.ts`: 18 recruitment fraud heuristic rules.
  - `gemini.service.ts`: Contextual LLM reasoning via `@google/genai`.
  - `ml_client.service.ts`: HTTP client connecting to the FastAPI microservice.
  - `report_export.service.ts`: PDFKit and Docx forensic dossier generator.

---

## 13. Frontend Architecture

The React frontend utilizes a modular component layout styled with Tailwind CSS:

- **`src/App.tsx`:** Primary application controller managing view routing, authentication modals, and theme switching.
- **`src/components/analyzer/`:**
  - `JobAnalyzerForm.tsx`: Multi-tab submission interface supporting all 4 input modes.
  - `AnalysisResultView.tsx`: Comprehensive threat scorecard with gauge meters and actionable advice.
  - `RiskExplanationView.tsx`: Transparent breakdown of heuristic, ML, and AI factors.
  - `DomainIntelligenceView.tsx`: DNS, WHOIS, and ATS verification indicators.
  - `SuspiciousTextHighlighter.tsx`: Visual highlighter pinpointing fraudulent sentences.
- **`src/components/common/`:**
  - `Navbar.tsx` & `Footer.tsx`: Header navigation and system information.
  - `CaptchaBox.tsx`: Interactive challenge component for authentication flows.
  - `ThemeModal.tsx`: Visual switcher offering 10 bespoke color palettes.
  - `CookieBanner.tsx`: GDPR-compliant consent manager.
- **`src/context/ThemeContext.tsx`:** Theme provider persisting active theme to `localStorage` and user preferences.

---

## 14. Database Design

JobGuard AI uses MySQL 8.4 with 8 relational tables:

```
+--------------------+       +---------------------+       +-----------------------+
|       users        |<----->|    scan_history     |<----->|    uploaded_files     |
+--------------------+       +---------------------+       +-----------------------+
          |                             |
          v                             v
+--------------------+       +---------------------+       +-----------------------+
|  user_preferences  |       |      feedback       |       | threat_intel_domains  |
+--------------------+       +---------------------+       +-----------------------+
          |                                                            |
          v                                                            v
+--------------------+                                     +-----------------------+
| captcha_challenges |                                     |      audit_logs       |
+--------------------+                                     +-----------------------+
```

1. **`users`:** Accounts, bcrypt password hashes, and roles (`user`, `analyst`, `admin`).
2. **`captcha_challenges`:** Single-use cryptographic nonces with expiration tracking.
3. **`scan_history`:** Immutable forensic dossiers containing input metadata and risk scores.
4. **`threat_intel_domains`:** Verified ATS platforms and suspicious TLD taxonomy.
5. **`audit_logs`:** Audit trail for security actions, authentication, and admin tasks.
6. **`uploaded_files`:** Metadata for uploaded PDF, DOCX, and image documents.
7. **`feedback`:** User feedback on detection accuracy (false positives / negatives).
8. **`user_preferences`:** Theme palettes, color mode, and cookie consent state.

---

## 15. Installation Requirements

- **Operating System:** Windows 10 / Windows 11, macOS, or Linux.
- **Node.js:** v20 LTS, v22, or v26 LTS.
- **Python:** Python 3.12 (with pip).
- **Database Engine:** MySQL Server 8.4 Community Edition (or MySQL 8.0+).
- **Shell:** PowerShell 5.1+ (Windows) or Bash (macOS/Linux).

---

## 16. Local Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/CharanShaiva12/JobGuard-AI.git
cd JobGuard-AI
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

### 3. Install Backend Dependencies
```bash
cd backend
npm install
npm run build
cd ..
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. Install Python ML Dependencies
```bash
python -m pip install -r ml/requirements.txt
```

---

## 17. Environment Variable Configuration

Edit the root `.env` file with your configuration:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for the Express API Gateway |
| `NODE_ENV` | `development` | Node runtime environment |
| `API_PREFIX` | `/api` | Base path prefix for API endpoints |
| `CORS_ORIGIN` | `http://localhost:5173,...` | Allowed CORS origins |
| `JWT_SECRET` | *(string)* | Secret key for signing authentication JWT tokens |
| `JWT_EXPIRATION` | `24h` | Token expiration duration |
| `DB_HOST` | `127.0.0.1` | MySQL server host address |
| `DB_PORT` | `3306` | MySQL server port |
| `DB_USER` | `root` | MySQL database user |
| `DB_PASSWORD` | *(your password)* | MySQL database password |
| `DB_NAME` | `jobguard_db` | MySQL database name |
| `ML_SERVICE_URL` | `http://127.0.0.1:8000` | URL of the Python FastAPI ML microservice |
| `GEMINI_API_KEY` | *(optional)* | Google Gemini API key for contextual reasoning |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model identifier |
| `CAPTCHA_SECRET` | *(string)* | Secret token for HMAC CAPTCHA validation |
| `JOBGUARD_MODE` | `auto` | Operation mode: `auto`, `online`, or `offline` |

---

## 18. Database Setup

1. Ensure your MySQL server service (e.g., `MySQL84`) is running.
2. Initialize the database schema and seed data using the MySQL CLI:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/init.sql
mysql -u root -p < database/migrations.sql
```
Alternatively, JobGuard AI automatically verifies columns and schema compatibility on startup via `backend/src/utils/migrate.ts`.

---

## 19. How to Start the Application

### One-Click Launch (Windows)
Double-click `Start-JobGuard.bat` in the project root, or execute in PowerShell:
```powershell
.\start_services.ps1
```
The startup orchestrator will:
1. Verify MySQL connectivity.
2. Start the FastAPI ML microservice on `http://127.0.0.1:8000`.
3. Start the Express API Gateway on `http://127.0.0.1:5000`.
4. Start the React Vite dev server on `http://localhost:5173`.
5. Open your default web browser to `http://localhost:5173`.

### One-Click Shutdown (Windows)
Double-click `Stop-JobGuard.bat` or run:
```powershell
.\stop_services.ps1
```
Gracefully terminates services on ports 8000, 5000, and 5173 while leaving your MySQL service active.

### Manual Service Launch (Individual Terminals)
- **Terminal 1 (ML Microservice):**
  ```bash
  python -m uvicorn ml.app.main:app --host 127.0.0.1 --port 8000
  ```
- **Terminal 2 (Express Backend):**
  ```bash
  cd backend && npm start
  ```
- **Terminal 3 (React Frontend):**
  ```bash
  cd frontend && npm run dev
  ```

---

## 20. Testing Instructions

JobGuard AI provides comprehensive static, unit, and security test suites:

### 1. Run Python Automated Unit Tests & AST Validation
```bash
python testing/run_tests.py
```
Validates Python syntax AST across the codebase and executes unit tests for URL extraction, PhiUSIIL features, and Risk Fusion Equation 3.1.

### 2. Run Negative Security Boundary Tests
```bash
python testing/negative/test_security_negative.py
```
Validates SSRF prevention, pseudo-scheme blocking (`javascript:`, `data:`), and private subnet isolation.

### 3. Verify TypeScript Builds
```bash
# Backend build verification
cd backend && npm run build && cd ..

# Frontend build verification
cd frontend && npm run build && cd ..
```

### 4. Postman API Collection
Import `testing/postman/JobGuard_AI_API_Collection.json` into Postman to test:
- `GET /health` and `GET /api/dashboard/health`
- `GET /api/captcha/generate`
- `POST /api/auth/register` and `POST /api/auth/login`
- `POST /api/scan` (URL, Text, Company, Document modes)
- `GET /api/dashboard/summary`

---

## 21. Security Considerations

- **Credential Protection:** Passwords are never stored in plaintext and are salted using `bcrypt`. Secrets and API keys are isolated in `.env` and strictly excluded from Git.
- **SSRF Mitigation:** All user-provided URLs undergo DNS resolution and are verified against private IPv4/IPv6 ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, link-local, and AWS/GCP cloud metadata endpoints).
- **Anti-Bot Dual CAPTCHA:** Nonce challenges prevent automated account creation and brute-force credential stuffing.
- **HTTP-Only Cookies:** Session tokens are delivered via `SameSite=Strict`, `HttpOnly` cookies to protect against cross-site scripting (XSS) token exfiltration.
- **Passive URL Topology:** URLs are analyzed structurally without rendering untrusted client-side payloads.

---

## 22. Current Limitations

- **Probabilistic Scoring:** Machine learning and generative AI inferences are probabilistic and serve as assistive cybersecurity risk assessments rather than legal guarantees.
- **Offline External Verification:** In offline mode (or when no Gemini API key is configured), external company verification relies on local threat intelligence lists and heuristic rules.
- **No Dynamic Headless Browser:** JobGuard AI intentionally avoids executing dynamic JavaScript on target URLs to prevent drive-by exploits and SSRF risks.

---

## 23. Future Enhancements

- **Browser Extension:** Chromium and Firefox extension for inline risk badges directly on LinkedIn, Indeed, and job boards.
- **Direct ATS Webhook Integration:** Live verification API integration with Greenhouse, Lever, and Workday verified tenant endpoints.
- **Multilingual NLP Models:** Expansion of text classifiers to support Spanish, German, French, and Hindi recruitment scams.
- **Decentralized Threat Intelligence:** Federated threat-sharing protocol for university career centers and cybersecurity organizations.

---

## 24. Project Directory Structure

```
JobGuard-AI/
├── .agents/                      # Agent rules and prompt guidelines
├── apache/                       # Apache reverse-proxy configuration templates
│   ├── .htaccess
│   └── jobguard.conf
├── backend/                      # Node.js Express TypeScript API Gateway
│   ├── src/
│   │   ├── config/               # Database pool and environment manager
│   │   ├── controllers/          # Auth, scan, captcha, dashboard, admin controllers
│   │   ├── middleware/           # JWT authentication and SSRF guards
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # Risk fusion, rule engine, Gemini, ML client
│   │   ├── types/                # TypeScript interface definitions
│   │   ├── utils/                # Database migrations, OCR, SSRF utilities
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── data/                         # Evaluation metrics, charts, and local datasets
│   ├── evaluation/               # ROC curves, confusion matrices, evaluation PNGs
│   └── raw/                      # Local raw datasets (excluded from Git)
├── database/                     # MySQL 8.4 SQL scripts
│   ├── init.sql                  # Seed threat intelligence taxonomy
│   ├── migrations.sql            # Schema migrations
│   └── schema.sql                # Complete relational schema
├── documentation/                # Architectural and technical documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── ML_EVALUATION.md
│   └── SECURITY_AND_CAPTCHA.md
├── frontend/                     # React 18 + Vite TypeScript Frontend
│   ├── src/
│   │   ├── components/           # UI views (analyzer, dashboard, auth, admin, themes)
│   │   ├── context/              # ThemeContext provider
│   │   ├── services/             # Axios API client
│   │   ├── types/                # UI TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── ml/                           # Python 3.12 FastAPI Machine Learning Service
│   ├── app/
│   │   ├── main.py               # FastAPI application endpoints
│   │   ├── text_preprocessor.py  # Text cleaning and tokenization
│   │   └── url_extractor.py      # 18 PhiUSIIL feature extractor
│   ├── artifacts/                # Trained model artifacts (.joblib) & metrics (.json)
│   ├── requirements.txt
│   ├── train_text_model.py       # EMSCAD text model training script
│   └── train_url_model.py        # PhiUSIIL URL model training script
├── reference/                    # Academic papers, synopsis, results, and evaluation scripts
│   ├── Datasets/                 # Local dataset copies (excluded from Git)
│   ├── JobGuard_Evaluation/      # Evaluation scripts and output metrics
│   ├── Research Papers/          # Academic literature on recruitment fraud
│   └── rulesprompt.txt
├── storage/                      # Secure file storage
│   ├── reports/                  # Generated forensic reports (.gitkeep)
│   └── uploads/                  # Temporary document attachments (.gitkeep)
├── testing/                      # Test suites and Postman collection
│   ├── negative/                 # Negative security boundary tests
│   ├── postman/                  # Postman API Collection
│   ├── unit/                     # Unit tests for risk fusion and rule engine
│   └── run_tests.py              # Automated test runner
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git exclusion rules
├── LICENSE                       # MIT License
├── README.md                     # Comprehensive project documentation
├── Start-JobGuard.bat            # One-click Windows startup script
├── start_services.ps1            # PowerShell service orchestrator
├── Stop-JobGuard.bat             # One-click Windows shutdown script
└── stop_services.ps1             # PowerShell shutdown script
```

---

## 25. License and Acknowledgements

### License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License
Copyright (c) 2026 Charan M
```

### Acknowledgements
- **University of the Aegean** for the EMSCAD dataset (Vidros et al.).
- **Arvind Prasad & Shalini Chandra** for the PhiUSIIL Phishing URL Dataset.
- **Google DeepMind** for the Gemini API platform.
- Open-source communities behind Scikit-learn, XGBoost, FastAPI, React, Vite, and Express.
