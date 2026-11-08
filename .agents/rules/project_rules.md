# JobGuard AI - Architectural & Development Rules

**Version:** 1.0.0  
**Effective Date:** 2026-11-05  
**Target Environment:** Windows 10/11 & Production Linux / Apache / MySQL 8.4  

---

## 1. No-Sample-Data & Ground-Truth Policy
1. **Zero Fake/Dummy Application Data:** Never generate or display hardcoded "sample jobs", mock application cards with fictional recruiters, placeholder company logos, or synthetic demonstration records in production components.
2. **Dynamic User-Driven Analysis:** All detection results must stem strictly from actual user-provided inputs processed dynamically through the multi-layer pipeline (Heuristics, TF-IDF + Logistic Regression, 18-Feature URL Model, and Gemini AI Contextual Reasoning).
3. **No Hardcoded Detection Results:** The system shall never return predetermined scores or static scam verdicts based on string equality or mock flags.
4. **No Invented Links or Fictional Company Details:** Any external verification check must rely only on legitimate public evidence or explicitly declare `UNABLE TO VERIFY`. Fictional career links or imaginary recruitment portals are strictly forbidden.

---

## 2. Machine Learning Integrity & Verified Reporting
1. **Never Claim Unverified ML Accuracy:** All quoted metric values must be backed by the evaluated benchmark runs documented in `JOBGUARD_AI_RESULTS.pdf` and `data/evaluation/`:
   - **EMSCAD (Text Model - TF-IDF + Logistic Regression, 70:30 Split):**
     * Accuracy: 97.45%
     * Precision: 100.00%
     * Recall: 47.31% (Improved class-weighted: 86.54%)
     * F1-Score: 64.23% (Improved class-weighted: 84.91%)
     * ROC-AUC: 98.36% (Improved: 98.86%)
   - **PhiUSIIL (URL Model - 18 Numerical Features + XGBoost, 70:30 Split):**
     * Accuracy: 99.75%
     * Precision: 99.98%
     * Recall: 99.44%
     * F1-Score: 99.71%
     * ROC-AUC: 99.87%
   - **PhiUSIIL (URL Model - 18 Numerical Features + Logistic Regression, 70:30 Split):**
     * Accuracy: 99.77%
     * Precision: 99.99%
     * Recall: 99.46%
     * F1-Score: 99.73%
     * ROC-AUC: 99.86%
   - **Arithmetic Mean of 3 Pipelines (Descriptive Only):**
     * Accuracy: 98.99% | Precision: 99.99% | Recall: 82.07% | F1-Score: 87.89% | ROC-AUC: 99.36%
     * Note: Explicitly state that this is a mathematical descriptive summary across different feature spaces, NOT a single fourth trained model on merged datasets.
2. **Zero Data Leakage:** Text vectorizers and scalers must be fitted solely on training splits, never on held-out test records.
3. **18-Feature URL Extraction Standard:** The URL engine must extract exactly the 18 documented structural features from the raw input URL (`URLLength`, `DomainLength`, `IsDomainIP`, `TLDLength`, `NoOfSubDomain`, `HasObfuscation`, `NoOfObfuscatedChar`, `ObfuscationRatio`, `NoOfLettersInURL`, `LetterRatioInURL`, `NoOfDegitsInURL`, `DegitRatioInURL`, `NoOfEqualsInURL`, `NoOfQMarkInURL`, `NoOfAmpersandInURL`, `NoOfOtherSpecialCharsInURL`, `SpacialCharRatioInURL`, `IsHTTPS`).
4. **Preserve Original Datasets:** Original dataset files in `reference/` and `data/raw/` must remain untouched.

---

## 3. Consensus Risk-Fusion Formula
1. **Mathematical Baseline Formulation (SRS Equation 3.1):**
   $$R = 100 \times (0.35H + 0.25M + 0.15U + 0.25G)$$
   Where:
   - $R$: Composite Risk Score ($0 - 100$)
   - $H$: Deterministic Rule / Payment / Advance-Fee Heuristic Evidence ($0.0 - 1.0$)
   - $M$: EMSCAD Text Model Probability ($0.0 - 1.0$)
   - $U$: PhiUSIIL URL Threat Model Probability ($0.0 - 1.0$)
   - $G$: Cloud Gemini AI Contextual Reasoning Evidence ($0.0 - 1.0$)
2. **Missing Stream Safeguards:**
   - If URL is not supplied ($U$ absent): Normalize weights dynamically across available streams ($H = 0.45, M = 0.30, G = 0.25$, or if offline: $H = 0.60, M = 0.40$).
   - If Gemini is unavailable / offline: Reallocate the $0.25G$ weight proportionally to $H, M, U$ while clearly annotating `Gemini Contextual AI: Offline / Unconfigured`.
3. **Critical Deterministic Overrides:**
   - Active Advance-Fee Demands (mandatory registration fee, refundable security deposit, crypto wallet payment, bank credential / OTP requests) trigger a minimum risk score of $85$ (High / Dangerous).

---

## 4. UI/UX Rules (Apple-Inspired Design Restraint)
Strictly adheres to `rulesprompt.txt`:
1. **Aesthetic Direction:**
   - Clean, polished layout with the restraint and product focus of Apple marketing pages.
   - Background: Near-white or warm neutral background (`#F5F5F7` / `#F8F9FA` / `#FAFAFC`), NEVER pure `#FFFFFF` as the main canvas background.
   - Text: Dark, high-contrast readable typography (`#1D1D1F`, `#333336`, `#6E6E73`).
   - Accent: Single restrained primary accent (e.g., deep cobalt / refined slate blue `#0071E3` or `#185ABC`).
2. **Forbidden Anti-Patterns:**
   - No harsh gradients, rainbow coloring, neon colors, generic pastels, or purple-and-black cyberpunk themes.
   - No drop shadows on everything; use subtle $1\text{px}$ borders (`border-black/5` or `border-neutral-200`) and soft, minimal elevation only where required.
   - No radial orbs, dot grids, liquid glass, decorative colored stripes, sparkle icons, emojis, or animated arrows.
   - Do NOT default to three feature cards in a row, bento grids, decorative terminal windows, checkmark bullets, or fake 3-tier pricing.
   - Do NOT use Inter, Geist, Space Grotesk, or Lucide icons. Use a system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) and clean custom inline SVGs.
3. **Copy & Text Standards:**
   - Write specific, direct copy without em dashes (—), en dashes (–), or "It's not X, it's Y" cliché phrasing.
   - State product capabilities and security benefits directly.
   - No placeholder text (`Lorem Ipsum`, `John Doe`, etc.).
4. **Responsive & Accessible Behavior:**
   - No horizontal scrolling; prevent mobile overflow (`overflow-x: hidden`).
   - Clickable branding logo routing to the home dashboard.
   - Fully working mobile navigation drawer with accessible ARIA tags and keyboard focus trapping.
   - Skeleton loaders used only where real asynchronous data is in transit (no artificial delay timers).
   - Dedicated, compliant Terms of Service (`/terms`) and Privacy Policy (`/privacy`) pages.
   - Custom 404 Not Found page, working favicon, accessible error banners, and success toasts.

---

## 5. Security & Authentication Requirements
1. **Dual CAPTCHA Enforcement:**
   - Both User Registration (`POST /api/auth/register`) AND User Login (`POST /api/auth/login`) MUST require and validate a cryptographically signed CAPTCHA token.
   - CAPTCHA tokens expire within 5 minutes and cannot be reused (one-time nonce validation).
2. **Authentication & Session Tokens:**
   - Passwords hashed using `bcrypt` with work factor $\ge 12$.
   - JWT session tokens issued with standard expiration (e.g. 24 hours), carrying user ID and email, validated via bearer authorization middleware.
3. **Database Security & Injection Defense:**
   - 100% parameterized SQL queries via connection pool (`mysql2/promise`). Zero raw string concatenation.
4. **Input Sanitization & Boundary Defense:**
   - Sanitize all incoming text fields against XSS using strict Unicode normalization and HTML entity escaping.
   - Maximum URL length: $4,096$ characters. Reject unsupported pseudo-schemes (`javascript:`, `data:`, `file:`, `ftp:`).
5. **Secrets Management:**
   - Server secrets (`JWT_SECRET`, `DB_PASSWORD`, `GEMINI_API_KEY`) must strictly reside on the server in `.env` and never leak into frontend bundles.

---

## 6. Database Requirements (MySQL 8.4 Exclusively)
1. **Engine & Charset:**
   - Target database: MySQL 8.4 (`InnoDB` storage engine, `utf8mb4` character set, `utf8mb4_unicode_ci` collation).
   - MongoDB and SQLite are deprecated and disallowed.
2. **Schema Integrity:**
   - Normalized relational tables:
     * `users`: Primary auth record (`id`, `username`, `email`, `password_hash`, `full_name`, `organization`, timestamps).
     * `scan_history`: Comprehensive scan dossiers (`id`, `user_id`, `job_title`, `company_name`, `job_description`, `application_url`, `overall_risk_score`, `risk_level`, `ml_probability`, `url_risk`, `payment_risk`, `gemini_reasoning`, `full_analysis_json`, timestamps).
     * `captcha_tokens`: Secure token nonce store for login/registration validation.
     * `threat_intel_cache`: Reusable domain and employer intelligence logs.
   - Foreign key constraints with cascading deletes where appropriate.
   - Explicit B-Tree indexes on query keys (`user_id`, `created_at`, `username`, `email`).

---

## 7. Google Gemini AI Evidence Guidelines
1. **Evidentiary Prompting:** Prompts dispatched to the Gemini API (`gemini-2.5-flash` / `gemini-1.5-pro`) must supply normalized job metadata, matched heuristic rules, and URL topology indicators.
2. **Structured JSON Output:** Responses must be requested and parsed as structured schema containing:
   - `reasoning`: Multi-point forensic analysis of the posting.
   - `psychological_triggers`: Detected urgency, coercion, or unrealistic promises.
   - `risk_score`: Calibrated cloud assessment ($0.0 - 1.0$).
   - `actionable_advisory`: Concrete next steps for the job applicant.
3. **Offline / Missing Key Resilience:** If `GEMINI_API_KEY` is missing or the external API call times out, the system must not crash. It must mark Gemini evidence as `UNAVAILABLE_OFFLINE`, adjust risk-fusion weights to available local modules, and continue smoothly.

---

## 8. Source Code Comments & Documentation Policy
1. **Mandatory Commenting Standard:** Every important source file, class, interface, and function in both TypeScript (backend & frontend) and Python (ML service) must have clear, meaningful docstrings and inline commentary.
2. **Algorithmic Explanation:** Document the purpose, input parameters, returned artifacts, edge case handling, and algorithmic rationale (e.g. why TF-IDF sublinear scaling is selected, how Levenshtein distance detects typosquatting, how the composite score is fused).

---

## 9. Comprehensive Testing Framework
1. **Testing Suites Required:**
   - **Static AST Validation:** Syntax check without code execution across all modules.
   - **Unit Tests:** Regex rules, URL feature extractor, text preprocessing, and scoring functions.
   - **Integration Tests:** REST API routing, database transactions, dual CAPTCHA lifecycle, and auth guards.
   - **Negative Testing:** Malformed inputs, SQL injection attempts, oversized payloads, missing fields.
   - **Postman API Test Suite:** Complete collection with automated status, schema, and latency assertions.
   - **Accessibility & Frontend Auditing:** DevTools and accessibility checks.
