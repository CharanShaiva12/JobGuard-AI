/**
 * JobGuard AI - Authentication & Role-Based Authorization Middleware
 * Module: backend.src.middleware.auth.middleware
 * Purpose: Validates JWT tokens from Authorization header or HTTP-only cookies,
 *          and enforces role-based access controls ('admin', 'analyst', 'user').
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  // Fallback to HTTP-only cookie if configured
  if ((req as any).cookies && (req as any).cookies.jobguard_session) {
    return (req as any).cookies.jobguard_session;
  }
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user',
    };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired session. Please sign in again.' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role || 'user',
      };
    } catch {
      // Guest access allowed
    }
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
    }
  });
}
