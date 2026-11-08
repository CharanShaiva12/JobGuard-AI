/**
 * JobGuard AI - Authentication & Identity Management Service
 * Module: backend.src.services.auth.service
 * Purpose: Manages cryptographically secure user registration, credential validation,
 *          session token generation, student/job-seeker profiles, and password rotations.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { config } from '../config/env.js';
import { CaptchaService } from './captcha.service.js';

export interface UserProfileData {
  fullName?: string;
  organization?: string;
  accountType?: 'student' | 'job_seeker';
  collegeUniversity?: string;
  courseDegree?: string;
  graduationYear?: number;
  highestQualification?: string;
  experienceLevel?: string;
  preferredJobRole?: string;
  preferredLocation?: string;
}

export class AuthService {
  /**
   * Registers a new user account with mandatory CAPTCHA validation.
   */
  public static async register(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    organization?: string;
    accountType?: 'student' | 'job_seeker';
    collegeUniversity?: string;
    courseDegree?: string;
    graduationYear?: number;
    highestQualification?: string;
    experienceLevel?: string;
    preferredJobRole?: string;
    preferredLocation?: string;
    captchaId: string;
    captchaSolution: string;
  }): Promise<{ user: any; token: string }> {
    // 1. Mandatory CAPTCHA validation for Registration
    const captchaCheck = await CaptchaService.verify(data.captchaId, data.captchaSolution, 'register');
    if (!captchaCheck.valid) {
      throw new Error(`CAPTCHA validation failed: ${captchaCheck.reason}`);
    }

    // 2. Validate input constraints
    const cleanUsername = data.username.trim();
    const cleanEmail = data.email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    // 3. Check for existing username or email in MySQL
    try {
      const existing = await query<any[]>(
        'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
        [cleanUsername, cleanEmail]
      );

      if (existing && existing.length > 0) {
        if (existing[0].username.toLowerCase() === cleanUsername.toLowerCase()) {
          throw new Error('Username is already registered.');
        }
        if (existing[0].email.toLowerCase() === cleanEmail.toLowerCase()) {
          throw new Error('Email is already registered.');
        }
      }

      // 4. Hash password with bcrypt work factor 12
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(data.password, salt);

      const accountType = data.accountType === 'student' ? 'student' : 'job_seeker';

      // 5. Insert new user into MySQL 8.4 database
      const result: any = await query(
        `INSERT INTO users (
           username, email, password_hash, full_name, organization, role, is_active,
           account_type, college_university, course_degree, graduation_year,
           highest_qualification, experience_level, preferred_job_role, preferred_location,
           must_change_password
         )
         VALUES (?, ?, ?, ?, ?, 'user', 1, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          cleanUsername,
          cleanEmail,
          passwordHash,
          data.fullName?.trim() || '',
          data.organization?.trim() || '',
          accountType,
          data.collegeUniversity?.trim() || null,
          data.courseDegree?.trim() || null,
          data.graduationYear ? Number(data.graduationYear) : null,
          data.highestQualification?.trim() || null,
          data.experienceLevel?.trim() || null,
          data.preferredJobRole?.trim() || null,
          data.preferredLocation?.trim() || null,
        ]
      );

      const userId = result.insertId;

      // 6. Generate session JWT
      const token = jwt.sign(
        { id: userId, username: cleanUsername, email: cleanEmail, role: 'user' },
        config.jwtSecret,
        { expiresIn: config.jwtExpiration as any }
      );

      return {
        user: {
          id: userId,
          username: cleanUsername,
          email: cleanEmail,
          full_name: data.fullName?.trim() || '',
          organization: data.organization?.trim() || '',
          role: 'user',
          account_type: accountType,
          college_university: data.collegeUniversity?.trim() || null,
          course_degree: data.courseDegree?.trim() || null,
          graduation_year: data.graduationYear ? Number(data.graduationYear) : null,
          highest_qualification: data.highestQualification?.trim() || null,
          experience_level: data.experienceLevel?.trim() || null,
          preferred_job_role: data.preferredJobRole?.trim() || null,
          preferred_location: data.preferredLocation?.trim() || null,
          must_change_password: 0,
        },
        token,
      };
    } catch (err: any) {
      if (
        err.message.includes('CAPTCHA') ||
        err.message.includes('already registered') ||
        err.message.includes('must be at least') ||
        err.message.includes('valid email')
      ) {
        throw err;
      }
      console.error(`[AuthService] Registration failure: ${err.message}`);
      throw new Error(`Registration failed: ${err.message}`);
    }
  }

  /**
   * Authenticates user credentials with mandatory CAPTCHA validation.
   */
  public static async login(data: {
    identifier: string; // username or email
    password: string;
    captchaId: string;
    captchaSolution: string;
  }): Promise<{ user: any; token: string; mustChangePassword?: boolean }> {
    // 1. Mandatory CAPTCHA validation for Login
    const captchaCheck = await CaptchaService.verify(data.captchaId, data.captchaSolution, 'login');
    if (!captchaCheck.valid) {
      throw new Error(`CAPTCHA validation failed: ${captchaCheck.reason}`);
    }

    const cleanIdentifier = data.identifier.trim();
    if (!cleanIdentifier || !data.password) {
      throw new Error('Username/email and password are required.');
    }

    try {
      const rows = await query<any[]>(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1',
        [cleanIdentifier, cleanIdentifier.toLowerCase()]
      );

      if (!rows || rows.length === 0) {
        throw new Error('Invalid username/email or password.');
      }

      const user = rows[0];
      const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid username/email or password.');
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiration as any }
      );

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          organization: user.organization,
          role: user.role,
          account_type: user.account_type || 'job_seeker',
          college_university: user.college_university || '',
          course_degree: user.course_degree || '',
          graduation_year: user.graduation_year || null,
          highest_qualification: user.highest_qualification || '',
          experience_level: user.experience_level || '',
          preferred_job_role: user.preferred_job_role || '',
          preferred_location: user.preferred_location || '',
          must_change_password: user.must_change_password ? 1 : 0,
        },
        token,
        mustChangePassword: Boolean(user.must_change_password),
      };
    } catch (err: any) {
      if (err.message.includes('CAPTCHA') || err.message.includes('Invalid username')) {
        throw err;
      }
      console.error(`[AuthService] Database error: ${err.message}`);
      throw new Error('Authentication service unavailable. Please check database connection.');
    }
  }

  /**
   * Retrieves profile details for an authenticated user.
   */
  public static async getProfile(userId: number): Promise<any> {
    const rows = await query<any[]>(
      `SELECT id, username, email, full_name, organization, role, account_type,
              college_university, course_degree, graduation_year, highest_qualification,
              experience_level, preferred_job_role, preferred_location, must_change_password,
              created_at
       FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      throw new Error('User not found.');
    }

    return rows[0];
  }

  /**
   * Updates student or job seeker profile attributes.
   */
  public static async updateProfile(userId: number, data: UserProfileData): Promise<any> {
    await query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           organization = COALESCE(?, organization),
           account_type = COALESCE(?, account_type),
           college_university = ?,
           course_degree = ?,
           graduation_year = ?,
           highest_qualification = ?,
           experience_level = ?,
           preferred_job_role = ?,
           preferred_location = ?
       WHERE id = ?`,
      [
        data.fullName?.trim() || null,
        data.organization?.trim() || null,
        data.accountType || null,
        data.collegeUniversity !== undefined ? data.collegeUniversity?.trim() : null,
        data.courseDegree !== undefined ? data.courseDegree?.trim() : null,
        data.graduationYear !== undefined ? Number(data.graduationYear) : null,
        data.highestQualification !== undefined ? data.highestQualification?.trim() : null,
        data.experienceLevel !== undefined ? data.experienceLevel?.trim() : null,
        data.preferredJobRole !== undefined ? data.preferredJobRole?.trim() : null,
        data.preferredLocation !== undefined ? data.preferredLocation?.trim() : null,
        userId,
      ]
    );

    return this.getProfile(userId);
  }

  /**
   * Updates an existing user's password, clearing must_change_password flag.
   */
  public static async changePassword(
    userId: number,
    oldPassword?: string,
    newPassword?: string,
    forceAdminReset = false
  ): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const rows = await query<any[]>(
      'SELECT id, password_hash, must_change_password FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      throw new Error('User not found.');
    }

    const user = rows[0];

    // If not a forced reset and user didn't have must_change_password=1, verify old password
    if (!forceAdminReset && !user.must_change_password) {
      if (!oldPassword) {
        throw new Error('Current password is required.');
      }
      const isValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValid) {
        throw new Error('Current password does not match.');
      }
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [newHash, userId]
    );
  }
}
