# JobGuard AI — Relational Database Architecture

## 1. Engine & Configuration Standards
- **RDBMS Engine:** MySQL Server 8.4 (Community Edition).
- **Storage Engine:** `InnoDB` for full ACID transactional integrity and foreign key constraints.
- **Character Encoding:** `utf8mb4` with `utf8mb4_unicode_ci` collation.
- **Connection Management:** Connection pool via Node.js `mysql2/promise` with configurable pool limits (`DB_CONNECTION_LIMIT=10`), keep-alive pings, and automatic reconnection.

---

## 2. Relational Entity Relationship Diagram
```
  +-------------------------+
  |         users           |
  +-------------------------+
  | PK  id                  |
  |     username (UQ)       |
  |     email (UQ)          |
  |     password_hash       |
  |     full_name           |
  |     organization        |
  |     role                |
  |     is_active           |
  |     created_at          |
  |     updated_at          |
  +-------------------------+
               | 1
               |
               | N
  +-------------------------+          +-------------------------+
  |      scan_history       |          |   captcha_challenges    |
  +-------------------------+          +-------------------------+
  | PK  id (UUID v4)        |          | PK  id (UUID v4)        |
  | FK  user_id             |          |     solution_hash       |
  |     job_title           |          |     action (reg/login)  |
  |     company_name        |          |     ip_address          |
  |     job_description     |          |     is_used             |
  |     application_url     |          |     expires_at          |
  |     overall_risk_score  |          |     created_at          |
  |     risk_level          |          +-------------------------+
  |     ml_probability      |
  |     url_probability     |          +-------------------------+
  |     heuristic_score     |          |  threat_intel_domains   |
  |     gemini_score        |          +-------------------------+
  |     company_verif_status|          | PK  id                  |
  |     vacancy_verif_status|          |     domain_name (UQ)    |
  |     recruitment_status  |          |     category            |
  |     risk_breakdown_json |          |     threat_level        |
  |     matched_rules_json  |          |     notes               |
  |     extracted_entities  |          |     created_at          |
  |     gemini_reasoning    |          +-------------------------+
  |     actionable_advice   |
  |     input_type          |
  |     created_at          |
  +-------------------------+
```

---

## 3. Security & Anti-Abuse Policies
1. **Dual CAPTCHA Nonce Lifecycle:**
   - CAPTCHA tokens are generated via cryptographically secure random integers / equations and stored in `captcha_challenges` with SHA-256 hashed solutions.
   - Nonce entries expire within 300 seconds and are marked `is_used = 1` immediately upon first verification to prevent replay attacks.
2. **SQL Injection Defense:**
   - All database queries without exception use prepared parameterized statements (`?` placeholders). No user inputs are concatenated into SQL queries.
3. **Audit Logging:**
   - The `audit_logs` table records high-risk actions (failed logins, password changes, critical scan submissions) with client IP and timestamps.
