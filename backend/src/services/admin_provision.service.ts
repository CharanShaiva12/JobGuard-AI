/**
 * JobGuard AI - Administrator Auto-Provisioning Service
 * Module: backend.src.services.admin_provision.service
 * Purpose: Ensures an authorized administrative account exists with a cryptographically
 *          secure temporary password if none is configured, enforcing password change
 *          on initial access.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

export class AdminProvisionService {
  public static async ensureAdminAccount(): Promise<void> {
    try {
      const existingAdmins = await query<any[]>(
        "SELECT id, username, email FROM users WHERE role = 'admin' LIMIT 1"
      );

      if (existingAdmins && existingAdmins.length > 0) {
        return; // Admin account already exists
      }

      // Generate a secure 12-character alphanumeric temporary password
      const tempPassword = crypto.randomBytes(9).toString('base64url').slice(0, 12);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);

      const username = 'admin';
      const email = 'admin@jobguard.local';
      const fullName = 'JobGuard Administrator';
      const organization = 'JobGuard AI Security';

      await query(
        `INSERT INTO users (username, email, password_hash, full_name, organization, role, is_active, must_change_password, account_type)
         VALUES (?, ?, ?, ?, ?, 'admin', 1, 1, 'job_seeker')`,
        [username, email, passwordHash, fullName, organization]
      );

      console.log('\n================================================================');
      console.log(' [JobGuard AI Security] Administrator Account Provisioned');
      console.log('----------------------------------------------------------------');
      console.log(` Username:           ${username}`);
      console.log(` Email:              ${email}`);
      console.log(` Temporary Password: ${tempPassword}`);
      console.log(' Status:             One-time temporary credential (must change)');
      console.log(' Portal:             /admin/login');
      console.log('================================================================\n');
    } catch (err: any) {
      console.warn(`[AdminProvisionService] Notice during admin provision check: ${err.message}`);
    }
  }
}
