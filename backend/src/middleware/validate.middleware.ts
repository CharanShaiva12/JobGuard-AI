/**
 * JobGuard AI - Zod Request Validation Middleware & Schemas
 * Module: backend.src.middleware.validate.middleware
 * Purpose: Centralized schema validation for JSON request bodies using Zod,
 *          preserving backward compatibility with all existing client payload shapes.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const fieldPath = firstIssue?.path?.length ? `${firstIssue.path.join('.')}: ` : '';
      res.status(400).json({
        success: false,
        error: `${fieldPath}${firstIssue?.message || 'Invalid request payload.'}`,
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

// ------------------------------------------------------------------------------
// Auth Schemas
// ------------------------------------------------------------------------------
export const registerSchema = z
  .object({
    username: z.string().trim().min(2, 'Username must be at least 2 characters.').max(100),
    email: z.string().trim().email('Please provide a valid email address.').max(150),
    password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
    fullName: z.string().max(150).optional(),
    organization: z.string().max(150).optional(),
    accountType: z.enum(['student', 'job_seeker']).optional(),
    collegeUniversity: z.string().max(150).optional(),
    courseDegree: z.string().max(100).optional(),
    graduationYear: z.union([z.number().int(), z.string()]).optional(),
    highestQualification: z.string().max(100).optional(),
    experienceLevel: z.string().max(50).optional(),
    preferredJobRole: z.string().max(100).optional(),
    preferredLocation: z.string().max(100).optional(),
    captchaId: z.string().min(1, 'CAPTCHA verification is required for registration.'),
    captchaSolution: z.union([z.string().min(1), z.number()]),
  })
  .passthrough();

export const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    password: z.string().min(1, 'Password is required.').max(128),
    captchaId: z.string().min(1, 'CAPTCHA verification is required for login.'),
    captchaSolution: z.union([z.string().min(1), z.number()]),
  })
  .passthrough()
  .refine((data) => Boolean(data.identifier || data.username || data.email), {
    message: 'Username or email is required.',
    path: ['identifier'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.').max(128),
  })
  .passthrough();

// ------------------------------------------------------------------------------
// Scan Schemas
// ------------------------------------------------------------------------------
export const analyzeJobSchema = z
  .object({
    jobTitle: z.string().max(500).optional(),
    companyName: z.string().max(300).optional(),
    recruiterName: z.string().max(300).optional(),
    jobLocation: z.string().max(300).optional(),
    jobDescription: z.string().max(100000).optional(),
    applicationUrl: z.string().max(2048).nullable().optional(),
    requirements: z.string().max(50000).optional(),
    benefits: z.string().max(50000).optional(),
    companyProfile: z.string().max(50000).optional(),
    inputType: z.string().max(50).optional(),
  })
  .passthrough();

export const analyzeUrlSchema = z
  .object({
    url: z.string().trim().min(1, 'URL parameter is required.').max(2048),
  })
  .passthrough();

export const verifyCompanySchema = z
  .object({
    companyName: z.string().trim().min(1, 'Company name is required.').max(300),
  })
  .passthrough();

// ------------------------------------------------------------------------------
// Feedback & Preferences Schemas
// ------------------------------------------------------------------------------
export const submitFeedbackSchema = z
  .object({
    scanId: z.string().trim().min(1, 'scanId is required.').max(64),
    feedbackType: z.enum([
      'correct_detection',
      'incorrect_detection',
      'false_positive',
      'false_negative',
      'accurate',
      'correct',
      'incorrect',
      'inaccurate',
    ]),
    comments: z.string().max(2000).optional(),
  })
  .passthrough();

export const updatePreferencesSchema = z
  .object({
    theme: z.string().min(1).max(50).optional(),
    colorMode: z.enum(['light', 'dark', 'system']).optional(),
    color_mode: z.enum(['light', 'dark', 'system']).optional(),
    cookieConsent: z.enum(['all', 'necessary_only', 'custom', 'undecided']).optional(),
    cookie_consent: z.enum(['all', 'necessary_only', 'custom', 'undecided']).optional(),
  })
  .passthrough();
