/**
 * JobGuard AI - Authentication Controller
 * Module: backend.src.controllers.auth.controller
 * Purpose: Handles user registration, login, logout, profile validation, and password changes.
 * Security: Enforces dual server-side single-use CAPTCHAs, bcrypt hashing, and HTTP-only session cookies.
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        fullName,
        organization,
        accountType,
        collegeUniversity,
        courseDegree,
        graduationYear,
        highestQualification,
        experienceLevel,
        preferredJobRole,
        preferredLocation,
        captchaId,
        captchaSolution,
      } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ success: false, error: 'Username, email, and password are required.' });
        return;
      }
      if (!captchaId || captchaSolution === undefined) {
        res.status(400).json({ success: false, error: 'CAPTCHA verification is required for registration.' });
        return;
      }

      const result = await AuthService.register({
        username,
        email,
        password,
        fullName,
        organization,
        accountType,
        collegeUniversity,
        courseDegree,
        graduationYear,
        highestQualification,
        experienceLevel,
        preferredJobRole,
        preferredLocation,
        captchaId,
        captchaSolution: String(captchaSolution),
      });

      // Set secure HTTP-only cookie
      res.cookie('jobguard_session', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, username, email, password, captchaId, captchaSolution } = req.body;
      const idOrEmail = identifier || username || email;

      if (!idOrEmail || !password) {
        res.status(400).json({ success: false, error: 'Username/email and password are required.' });
        return;
      }
      if (!captchaId || captchaSolution === undefined) {
        res.status(400).json({ success: false, error: 'CAPTCHA verification is required for login.' });
        return;
      }

      const result = await AuthService.login({
        identifier: idOrEmail,
        password,
        captchaId,
        captchaSolution: String(captchaSolution),
      });

      // Set secure HTTP-only cookie
      res.cookie('jobguard_session', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Authenticated successfully.',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message });
    }
  }

  public static async adminLogin(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, username, email, password, captchaId, captchaSolution } = req.body;
      const idOrEmail = identifier || username || email;

      if (!idOrEmail || !password) {
        res.status(400).json({ success: false, error: 'Administrator identifier and password are required.' });
        return;
      }
      if (!captchaId || captchaSolution === undefined) {
        res.status(400).json({ success: false, error: 'CAPTCHA verification is required for admin login.' });
        return;
      }

      const result = await AuthService.login({
        identifier: idOrEmail,
        password,
        captchaId,
        captchaSolution: String(captchaSolution),
      });

      if (result.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Access denied: Administrative privileges required.',
        });
        return;
      }

      // Set secure HTTP-only cookie
      res.cookie('jobguard_session', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Administrator authenticated successfully.',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message });
    }
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('jobguard_session');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }
    try {
      const fullProfile = await AuthService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: { user: fullProfile },
      });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }
    try {
      const updatedUser = await AuthService.updateProfile(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: { user: updatedUser },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        message: 'Password updated successfully.',
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
