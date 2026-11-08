# JobGuard AI — Security & Dual CAPTCHA Architecture

## 1. Dual CAPTCHA Enforcement (Registration & Login)
To safeguard user accounts and prevent automated scraping, credential-stuffing, and bot-generated registrations, JobGuard AI enforces cryptographic CAPTCHA verification on **both registration and login flows**.

### 1.1 Challenge Lifecycle
1. **Challenge Request (`GET /api/captcha/generate?action=[register|login]`):**
   - The backend generates an algebraic or visual verification challenge (e.g. `24 + 17 = ?` or SVG distorted alphanumeric string).
   - Generates a UUIDv4 `challengeId`.
   - Computes an HMAC-SHA256 signature of `challengeId + solution + secret`.
   - Stores the nonce in MySQL `captcha_challenges` table with an expiration timestamp ($300$ seconds / 5 minutes).
   - Returns the rendered SVG or challenge text and `challengeId` to the frontend.
2. **Submission & Verification (`POST /api/auth/register` or `POST /api/auth/login`):**
   - The user client must submit `captchaId` and `captchaSolution` in the request body alongside auth credentials.
   - The auth controller verifies:
     1. Existence and non-expired status of `captchaId` in `captcha_challenges`.
     2. `is_used == 0` (preventing replay attacks).
     3. Case-insensitive or mathematical equality of candidate solution against the hashed solution.
     4. Matching action context (`register` vs `login`).
   - Marks the token `is_used = 1` immediately inside the transaction.
   - If invalid or expired, returns `HTTP 400 Bad Request` with `code: "INVALID_CAPTCHA"`.

---

## 2. Authentication & Credential Hardening
1. **Password Storage:** Hashed using `bcrypt` with a minimum salt work factor of $12$. Plaintext passwords never touch logs or persistent storage.
2. **Session Verification:** Stateless JSON Web Tokens (JWT) signed with `HS256` or `RS256` and a high-entropy secret (`JWT_SECRET`).
3. **Brute Force Protection:** Express rate limiters (`express-rate-limit`) configured per IP address:
   - Max 5 failed login attempts per 15-minute window before exponential backoff.
   - Max 3 registration attempts per hour per IP.

---

## 3. Passive URL & Content Analysis Safeguards
1. **Zero External Script Execution:** The URL analyzer operates strictly on lexical and structural characteristics parsed from the URL string itself.
2. **No Webpage Scraping of Arbitrary User URLs:** Mitigates Server-Side Request Forgery (SSRF) and malicious payload execution.
3. **Input Sanitization:** Multi-step Unicode normalization and HTML entity escaping prevent stored and reflected XSS.
