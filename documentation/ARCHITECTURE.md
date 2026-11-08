# JobGuard AI — System Architecture Specification

## 1. System Overview
**JobGuard AI** is an intelligent, multi-layered cybersecurity platform engineered to detect and assess risks associated with fraudulent online employment solicitations, deceptive recruiter communications, and phishing career URLs.

The architecture strictly decouples responsibilities across 7 specialized modules:
```
+-----------------------------------------------------------------------------------+
|                                JOBGUARD AI SYSTEM                                 |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Presentation Layer]                                                             |
|  React 18 + TypeScript + Vite + Tailwind CSS (Apple-Restrained Design)            |
|                                |                                                  |
|                                v  (Reverse Proxy / HTTP)                          |
|  [Edge Web Server] Apache 2.4 (VirtualHost, Security Headers, mod_proxy)          |
|                                |                                                  |
|               +----------------+----------------+                                 |
|               |                                 |                                 |
|               v                                 v                                 |
|  [Backend API Gateway]             [Machine Learning Microservice]                |
|  Node.js + Express + TypeScript    Python 3.12 + FastAPI                          |
|  - JWT Authentication              - Sublinear TF-IDF (12,000 dimensions)         |
|  - Dual CAPTCHA Nonce Engine       - Calibrated Logistic Regression               |
|  - Deterministic Rule Engine (H)   - 18 Numerical URL Features + XGBoost          |
|  - Consensus Risk Fusion (R)       - Passive URL Topology Profiler                |
|  - Google Gemini AI Adapter (G)    - Official 70:30 Split Evaluated Metrics       |
|               |                                 |                                 |
|               v                                 |                                 |
|  [Database Layer]                               |                                 |
|  MySQL 8.4 Server (InnoDB, utf8mb4)             |                                 |
|  - Users & Credentials                          |                                 |
|  - Scan History Dossiers                        |                                 |
|  - CAPTCHA Challenge Store                      |                                 |
|  - Threat Intel Taxonomy                        |                                 |
|                                                                                   |
|  [Testing & Verification]                                                         |
|  - Static AST Validation | pytest Unit & Integration | Selenium E2E | Postman     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Multi-Engine Consensus Risk-Fusion Formulation
The final threat score is governed by Equation 3.1 from the SRS and Academic Synopsis:

$$R = 100 \times (0.35H + 0.25M + 0.15U + 0.25G)$$

### Component Weights & Safeguards
| Component | Symbol | Source / Engine | Baseline Weight | Missing Fallback Weight |
|---|---|---|---|---|
| **Deterministic Rules / Payment** | $H$ | Advance-fee regex, cryptocurrency, UPI, pressure tokens | 0.35 | 0.45 (if URL absent) |
| **Text Statistical ML** | $M$ | TF-IDF (1-2) + Logistic Regression (EMSCAD trained) | 0.25 | 0.30 (if URL absent) |
| **URL Threat Topology** | $U$ | 18 PhiUSIIL structural features + XGBoost | 0.15 | 0.00 (absent/unprovided) |
| **Cloud Contextual AI** | $G$ | Google Gemini Pro/Flash API structured reasoning | 0.25 | 0.25 (or redistributed if offline) |

### Hard Deterministic Overrides
If an active advance-fee extortion pattern is triggered (e.g. upfront payment required before job offer, mandatory security deposit, cryptocurrency wallet transfer, or request for online banking OTPs), the system enforces a minimum composite risk score of **85 (High Risk)** regardless of model probabilities.

---

## 3. Module Breakdown

### 3.1 Presentation Layer (`frontend/`)
- **Technology:** React 18, TypeScript, Vite, Tailwind CSS.
- **Visual Design:** Strictly follows Apple marketing aesthetics defined in `rulesprompt.txt`:
  - Near-white canvas background (`#F5F5F7`).
  - Dark readable typography (`#1D1D1F`).
  - Single restrained accent (`#0071E3`).
  - Zero harsh gradients, neon pastels, radial orbs, emojis, or decorative terminal windows.
  - No Inter, Geist, Space Grotesk, or Lucide icons (uses system font stack and inline SVGs).
  - Responsive drawer navigation, accessible ARIA landmarks, mobile overflow prevention.
  - Mandatory Terms of Service (`/terms`) and Privacy Policy (`/privacy`).

### 3.2 Backend Service (`backend/`)
- **Technology:** Node.js, Express, TypeScript.
- **Security:**
  - Dual CAPTCHA validation required for both registration and login endpoints.
  - Passwords hashed with `bcrypt` (work factor 12).
  - JWT tokens for stateless session verification.
  - 100% parameterized SQL queries via `mysql2/promise` against MySQL 8.4.
  - Zero hardcoded detection results or mock demonstration data.

### 3.3 Machine Learning Microservice (`ml/`)
- **Technology:** Python 3.12, FastAPI, Scikit-learn, XGBoost.
- **EMSCAD Text Model:**
  - 12,000 max feature sublinear TF-IDF vectorizer.
  - Balanced Logistic Regression trained on 70:30 stratified split.
- **PhiUSIIL URL Threat Model:**
  - 18 structural & lexical URL features extracted passively.
  - XGBoost (XGBClassifier) and Logistic Regression baseline trained on 70:30 stratified split.
- **Model Integrity:** Strict train-test separation with zero data leakage; unverified accuracy claims prohibited.

### 3.4 Relational Database (`database/`)
- **Technology:** MySQL Server 8.4 (Community Server).
- **Tables:** `users`, `captcha_challenges`, `scan_history`, `threat_intel_domains`, `audit_logs`.
- **Integrity:** Strict foreign key cascades, unique constraints, and B-Tree indexes.
- **No SQLite or MongoDB:** Completely replaced by MySQL 8.4.

### 3.5 Testing Suite (`testing/`)
- Static AST validation script (`tests/test_ast.py`).
- Unit tests (`tests/test_unit.py`).
- Integration tests (`tests/test_integration.py`).
- System & E2E tests (`tests/test_system_e2e.py`).
- Negative security test suite (`tests/test_negative.py`).
- Postman Collection (`JobGuard_AI_API_Collection.json`) validating 14 requests and 15 assertions.
