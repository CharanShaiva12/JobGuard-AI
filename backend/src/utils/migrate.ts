/**
 * JobGuard AI - Versioned Database Migration & Schema Compatibility Utility
 * Module: backend.src.utils.migrate
 * Purpose: Tracks and applies strictly additive, idempotent schema migrations via
 *          a versioned `schema_migrations` table without ever overwriting, dropping,
 *          or deleting any existing user records or scan history.
 */

import { query } from '../config/database.js';

interface MigrationDefinition {
  version: string;
  description: string;
  up: () => Promise<void>;
}

async function ensureColumn(table: string, columnName: string, spec: string): Promise<void> {
  const existingCols = await query<any[]>(`DESCRIBE \`${table}\``);
  const existingFieldNames = new Set(existingCols.map((c) => String(c.Field).toLowerCase()));
  if (!existingFieldNames.has(columnName.toLowerCase())) {
    await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${columnName}\` ${spec}`);
    console.log(`[Migration] Added column ${table}.${columnName}`);
  }
}

const MIGRATIONS: MigrationDefinition[] = [
  {
    version: '001_users_profile_columns',
    description: 'Ensure student/job-seeker profile and password rotation columns exist on users',
    up: async () => {
      const columnsToAdd = [
        { name: 'account_type', spec: "ENUM('student', 'job_seeker') NOT NULL DEFAULT 'job_seeker'" },
        { name: 'college_university', spec: 'VARCHAR(150) NULL' },
        { name: 'course_degree', spec: 'VARCHAR(100) NULL' },
        { name: 'graduation_year', spec: 'INT NULL' },
        { name: 'highest_qualification', spec: 'VARCHAR(100) NULL' },
        { name: 'experience_level', spec: 'VARCHAR(50) NULL' },
        { name: 'preferred_job_role', spec: 'VARCHAR(100) NULL' },
        { name: 'preferred_location', spec: 'VARCHAR(100) NULL' },
        { name: 'must_change_password', spec: 'TINYINT(1) NOT NULL DEFAULT 0' },
      ];
      for (const col of columnsToAdd) {
        await ensureColumn('users', col.name, col.spec);
      }
    },
  },
  {
    version: '002_scan_history_claimed_employer',
    description: 'Ensure claimed_employer column exists on scan_history (non-destructive)',
    up: async () => {
      await ensureColumn('scan_history', 'claimed_employer', 'VARCHAR(255) NULL AFTER `job_title`');
    },
  },
];

export async function runMigrations(): Promise<void> {
  try {
    // Strictly additive tracking table — never touches existing application tables
    await query(`
      CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
        \`version\` VARCHAR(64) PRIMARY KEY,
        \`description\` VARCHAR(255) NOT NULL,
        \`applied_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const appliedRows = await query<any[]>('SELECT version FROM `schema_migrations`');
    const appliedVersions = new Set(appliedRows.map((r) => String(r.version)));

    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }
      try {
        await migration.up();
        await query(
          'INSERT IGNORE INTO `schema_migrations` (`version`, `description`) VALUES (?, ?)',
          [migration.version, migration.description]
        );
        console.log(`[Migration] Recorded migration ${migration.version}`);
      } catch (migErr: any) {
        console.warn(`[Migration] Notice applying ${migration.version}: ${migErr.message}`);
      }
    }
  } catch (err: any) {
    console.warn(`[Migration] Migration check notice: ${err.message}`);
  }
}
