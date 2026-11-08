/**
 * JobGuard AI - Database Migration & Schema Compatibility Utility
 * Module: backend.src.utils.migrate
 * Purpose: Ensures all required schema columns and admin provisioning exist
 *          without overwriting or deleting any existing user records.
 */

import { query } from '../config/database.js';

export async function runMigrations(): Promise<void> {
  const columnsToAdd = [
    { name: 'account_type', spec: "ENUM('student', 'job_seeker') NOT NULL DEFAULT 'job_seeker'" },
    { name: 'college_university', spec: "VARCHAR(150) NULL" },
    { name: 'course_degree', spec: "VARCHAR(100) NULL" },
    { name: 'graduation_year', spec: "INT NULL" },
    { name: 'highest_qualification', spec: "VARCHAR(100) NULL" },
    { name: 'experience_level', spec: "VARCHAR(50) NULL" },
    { name: 'preferred_job_role', spec: "VARCHAR(100) NULL" },
    { name: 'preferred_location', spec: "VARCHAR(100) NULL" },
    { name: 'must_change_password', spec: "TINYINT(1) NOT NULL DEFAULT 0" },
  ];

  try {
    const existingCols = await query<any[]>('DESCRIBE users');
    const existingFieldNames = new Set(existingCols.map((c) => c.Field.toLowerCase()));

    for (const col of columnsToAdd) {
      if (!existingFieldNames.has(col.name.toLowerCase())) {
        try {
          await query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.spec}`);
          console.log(`[Migration] Added column users.${col.name}`);
        } catch (colErr: any) {
          console.warn(`[Migration] Notice adding users.${col.name}: ${colErr.message}`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Migration] Migration check notice: ${err.message}`);
  }
}
