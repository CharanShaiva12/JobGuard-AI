/**
 * JobGuard AI - User Preferences & Personalization Controller
 * Module: backend.src.controllers.user_preferences.controller
 * Purpose: Manages themes (10 bespoke palettes), color modes, and cookie consent in MySQL 8.4.
 */

import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const VALID_THEMES = [
  'royal_blue_cream',
  'cyan_ash_steel',
  'vista_blue_oxford',
  'forest_leaf',
  'electric_mint_carbon',
  'wine_red_sand',
  'cherry_alabaster',
  'midnight_indigo_vanilla',
  'warm_neutral_light',
  'carbon_slate_dark',
] as const;

export class UserPreferencesController {
  public static async getPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      if (!userId) {
        // Return defaults for guest
        res.status(200).json({
          success: true,
          data: {
            theme: 'warm_neutral_light',
            colorMode: 'system',
            cookieConsent: 'undecided',
            cookiePreferences: { analytics: false, functional: true, performance: true },
          },
        });
        return;
      }

      const rows = await query<any[]>('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
      if (rows && rows.length > 0) {
        const pref = rows[0];
        res.status(200).json({
          success: true,
          data: {
            theme: pref.theme,
            colorMode: pref.color_mode,
            cookieConsent: pref.cookie_consent,
            cookiePreferences: typeof pref.cookie_preferences_json === 'string'
              ? JSON.parse(pref.cookie_preferences_json)
              : pref.cookie_preferences_json || { analytics: false, functional: true, performance: true },
          },
        });
      } else {
        res.status(200).json({
          success: true,
          data: {
            theme: 'warm_neutral_light',
            colorMode: 'system',
            cookieConsent: 'undecided',
            cookiePreferences: { analytics: false, functional: true, performance: true },
          },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user ? req.user.id : null;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required to save server-side preferences.' });
        return;
      }

      const { theme, colorMode, cookieConsent, cookiePreferences } = req.body;

      const cleanTheme = VALID_THEMES.includes(theme) ? theme : 'warm_neutral_light';
      const cleanMode = ['light', 'dark', 'system'].includes(colorMode) ? colorMode : 'system';
      const cleanConsent = ['all', 'necessary_only', 'custom', 'undecided'].includes(cookieConsent) ? cookieConsent : 'undecided';
      const prefsJson = JSON.stringify(cookiePreferences || {});

      await query(
        `INSERT INTO user_preferences (user_id, theme, color_mode, cookie_consent, cookie_preferences_json)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           theme = VALUES(theme),
           color_mode = VALUES(color_mode),
           cookie_consent = VALUES(cookie_consent),
           cookie_preferences_json = VALUES(cookie_preferences_json)`,
        [userId, cleanTheme, cleanMode, cleanConsent, prefsJson]
      );

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully.',
        data: {
          theme: cleanTheme,
          colorMode: cleanMode,
          cookieConsent: cleanConsent,
          cookiePreferences: cookiePreferences || {},
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
