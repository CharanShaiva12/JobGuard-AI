/**
 * JobGuard AI - Structured JSON Logger & Request Correlation Middleware
 * Module: backend.src.utils.logger
 * Purpose: Provides structured pino JSON logging with per-request correlation IDs
 *          (X-Request-Id) and safe secret redaction.
 */

import crypto from 'crypto';
import pino from 'pino';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export const logger = pino({
  name: 'jobguard-backend',
  level: process.env.LOG_LEVEL || (config.nodeEnv === 'production' ? 'info' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'jwtSecret',
      'geminiApiKey',
      'captchaSecret',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim().slice(0, 64)
      : crypto.randomUUID();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const logPayload = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
    };

    if (res.statusCode >= 500) {
      logger.error(logPayload, 'HTTP request failed');
    } else if (res.statusCode >= 400) {
      logger.warn(logPayload, 'HTTP request client error');
    } else if (req.path !== '/health') {
      logger.info(logPayload, 'HTTP request completed');
    }
  });

  next();
}
