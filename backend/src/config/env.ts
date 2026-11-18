/**
 * JobGuard AI - Environment Configuration Manager
 * Module: backend.src.config.env
 * Purpose: Loads, validates, and exposes typed environment variables.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root or backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const DEFAULT_JWT_SECRET = 'jobguard_super_secure_jwt_secret_key_change_in_production_2026';
const DEFAULT_CAPTCHA_SECRET = 'jobguard_captcha_hmac_secret_token_2026';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // JWT Authentication
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',

  // MySQL 8.4 Configuration
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'jobguard_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },

  // FastAPI Machine Learning Microservice
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
  mlInternalApiKey: process.env.ML_INTERNAL_API_KEY || '',

  // Google Gemini API Configuration
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  geminiEnableSearchGrounding: process.env.GEMINI_ENABLE_SEARCH_GROUNDING === 'true',

  // Operation Mode: 'auto' | 'online' | 'offline'
  jobguardMode: ((process.env.JOBGUARD_MODE || 'auto').toLowerCase() as 'auto' | 'online' | 'offline'),

  // CAPTCHA Secret
  captchaSecret: process.env.CAPTCHA_SECRET || DEFAULT_CAPTCHA_SECRET,
  captchaExpirationSeconds: parseInt(process.env.CAPTCHA_EXPIRATION_SECONDS || '300', 10),
};

/**
 * Enforces strong non-default secrets when running in production mode.
 */
export function validateProductionSecrets(): void {
  if (config.nodeEnv !== 'production') return;

  const violations: string[] = [];
  if (!process.env.JWT_SECRET || config.jwtSecret === DEFAULT_JWT_SECRET || config.jwtSecret.length < 32) {
    violations.push('JWT_SECRET must be explicitly configured (>= 32 chars) in production.');
  }
  if (!process.env.CAPTCHA_SECRET || config.captchaSecret === DEFAULT_CAPTCHA_SECRET || config.captchaSecret.length < 24) {
    violations.push('CAPTCHA_SECRET must be explicitly configured (>= 24 chars) in production.');
  }
  if (!process.env.DB_PASSWORD || config.db.password === 'root') {
    violations.push('DB_PASSWORD must not use the default value in production.');
  }

  if (violations.length > 0) {
    throw new Error(`[JobGuard Security] Production configuration check failed:\n - ${violations.join('\n - ')}`);
  }
}

validateProductionSecrets();
