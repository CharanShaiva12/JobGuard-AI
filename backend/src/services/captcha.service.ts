/**
 * JobGuard AI - Cryptographic Dual CAPTCHA Service
 * Module: backend.src.services.captcha.service
 * Purpose: Issues and validates one-time cryptographic CAPTCHAs for BOTH registration and login.
 * Security: SHA-256 HMAC solution hashing, 300-second TTL, strict single-use nonce validation.
 */

import crypto from 'crypto';
import { query } from '../config/database.js';
import { config } from '../config/env.js';

export interface GeneratedCaptcha {
  id: string;
  question: string;
  svgImage: string;
  expiresInSeconds: number;
}

export class CaptchaService {
  /**
   * Hashes a user-submitted answer with HMAC-SHA256 secret.
   */
  private static hashSolution(solution: string): string {
    return crypto
      .createHmac('sha256', config.captchaSecret)
      .update(solution.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * Generates an accessible, SVG-rendered algebraic verification challenge.
   */
  public static async generate(action: 'register' | 'login' | 'scan', ipAddress = '127.0.0.1'): Promise<GeneratedCaptcha> {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 15) + 1;
    const isAddition = Math.random() > 0.3;

    const op = isAddition ? '+' : '-';
    const numA = isAddition ? num1 : Math.max(num1, num2);
    const numB = isAddition ? num2 : Math.min(num1, num2);
    const answer = isAddition ? numA + numB : numA - numB;

    const challengeId = crypto.randomUUID();
    const solutionHash = this.hashSolution(String(answer));
    const expiresAt = new Date(Date.now() + config.captchaExpirationSeconds * 1000);

    // Save one-time challenge nonce in MySQL 8.4 database
    try {
      await query(
        `INSERT INTO captcha_challenges (id, solution_hash, action, ip_address, is_used, expires_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [challengeId, solutionHash, action, ipAddress, expiresAt]
      );
    } catch (err: any) {
      console.error(`[CaptchaService] MySQL challenge save failure: ${err.message}`);
      throw new Error(`Failed to initialize secure CAPTCHA challenge in database: ${err.message}`);
    }

    // Render lightweight, accessible SVG verification badge (NO external font dependencies)
    const textPrompt = `Solve: ${numA} ${op} ${numB} = ?`;
    const svgImage = `
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="44" viewBox="0 0 160 44">
        <rect width="100%" height="100%" fill="#F5F5F7" rx="6" stroke="#D2D2D7" stroke-width="1"/>
        <line x1="10" y1="12" x2="150" y2="34" stroke="#E5E5EA" stroke-width="2"/>
        <line x1="20" y1="36" x2="140" y2="10" stroke="#E5E5EA" stroke-width="1.5"/>
        <text x="50%" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#1D1D1F" text-anchor="middle" letter-spacing="1">
          ${numA} ${op} ${numB} = ?
        </text>
      </svg>
    `.trim();

    return {
      id: challengeId,
      question: textPrompt,
      svgImage: `data:image/svg+xml;utf8,${encodeURIComponent(svgImage)}`,
      expiresInSeconds: config.captchaExpirationSeconds,
    };
  }

  /**
   * Verifies that the submitted CAPTCHA token is valid, unused, and matches the correct answer.
   */
  public static async verify(
    challengeId: string,
    candidateSolution: string,
    expectedAction: 'register' | 'login' | 'scan'
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!challengeId || candidateSolution === undefined || candidateSolution === null) {
      return { valid: false, reason: 'CAPTCHA challenge ID and solution are required.' };
    }

    const cleanSolution = String(candidateSolution).trim();
    if (!cleanSolution) {
      return { valid: false, reason: 'CAPTCHA solution cannot be empty.' };
    }

    try {
      const rows = await query<any[]>(
        `SELECT * FROM captcha_challenges WHERE id = ? LIMIT 1`,
        [challengeId]
      );

      if (!rows || rows.length === 0) {
        return { valid: false, reason: 'CAPTCHA challenge not found or expired.' };
      }

      const challenge = rows[0];

      // Check if already used (replay attack prevention)
      if (challenge.is_used === 1) {
        return { valid: false, reason: 'CAPTCHA has already been used. Please request a fresh challenge.' };
      }

      // Check expiration
      if (new Date() > new Date(challenge.expires_at)) {
        return { valid: false, reason: 'CAPTCHA challenge has expired.' };
      }

      // Check action boundary
      if (challenge.action !== expectedAction) {
        return { valid: false, reason: `CAPTCHA was issued for ${challenge.action}, not ${expectedAction}.` };
      }

      // Compare solution hash
      const computedHash = this.hashSolution(cleanSolution);
      if (computedHash !== challenge.solution_hash) {
        return { valid: false, reason: 'Incorrect CAPTCHA answer.' };
      }

      // Mark challenge as used
      await query(
        `UPDATE captcha_challenges SET is_used = 1 WHERE id = ?`,
        [challengeId]
      );

      return { valid: true };
    } catch (err: any) {
      console.error(`[CaptchaService] MySQL verification query failed: ${err.message}`);
      return { valid: false, reason: 'Database error verifying CAPTCHA.' };
    }
  }
}
