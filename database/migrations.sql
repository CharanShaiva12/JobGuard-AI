-- ==============================================================================
-- JobGuard AI - Database Migration 002: Additional Required Tables & Constraints
-- ==============================================================================

USE `jobguard_db`;

-- 1. Ensure user_id in scan_history is nullable for guest scans
ALTER TABLE `scan_history` MODIFY `user_id` INT NULL;

-- 2. Modify input_type to support 'url', 'text', 'company', 'document', 'image', 'combined'
ALTER TABLE `scan_history` MODIFY `input_type` VARCHAR(50) NOT NULL DEFAULT 'text';
ALTER TABLE `scan_history` MODIFY `company_verification_status` VARCHAR(64) NOT NULL DEFAULT 'UNABLE TO VERIFY';
ALTER TABLE `scan_history` MODIFY `vacancy_verification_status` VARCHAR(64) NOT NULL DEFAULT 'UNABLE TO VERIFY';
ALTER TABLE `scan_history` MODIFY `recruitment_status` VARCHAR(64) NOT NULL DEFAULT 'Unable to Verify';

-- 2b. Add claimed_employer column if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'jobguard_db' AND TABLE_NAME = 'scan_history' AND COLUMN_NAME = 'claimed_employer');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `scan_history` ADD COLUMN `claimed_employer` VARCHAR(255) NULL AFTER `job_title`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Create uploaded_files table
CREATE TABLE IF NOT EXISTS `uploaded_files` (
    `id` VARCHAR(64) PRIMARY KEY,
    `user_id` INT NULL,
    `scan_id` VARCHAR(64) NULL,
    `filename_orig` VARCHAR(255) NOT NULL,
    `filename_disk` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL,
    `extracted_text_preview` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_uploaded_files_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_uploaded_files_user` (`user_id`),
    INDEX `idx_uploaded_files_scan` (`scan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create feedback table
CREATE TABLE IF NOT EXISTS `feedback` (
    `id` VARCHAR(64) PRIMARY KEY,
    `scan_id` VARCHAR(64) NOT NULL,
    `user_id` INT NULL,
    `feedback_type` ENUM('correct_detection', 'incorrect_detection', 'false_positive', 'false_negative') NOT NULL,
    `comments` TEXT DEFAULT NULL,
    `user_ip` VARCHAR(45) DEFAULT '',
    `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `verified_label` TINYINT(1) NULL,
    `verified_at` TIMESTAMP NULL,
    `verified_by` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_feedback_scan` FOREIGN KEY (`scan_id`) REFERENCES `scan_history` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_feedback_scan` (`scan_id`),
    INDEX `idx_feedback_type` (`feedback_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create user_preferences table
CREATE TABLE IF NOT EXISTS `user_preferences` (
    `user_id` INT PRIMARY KEY,
    `theme` VARCHAR(50) NOT NULL DEFAULT 'warm_neutral_light',
    `color_mode` ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
    `cookie_consent` ENUM('all', 'necessary_only', 'custom', 'undecided') NOT NULL DEFAULT 'undecided',
    `cookie_preferences_json` JSON DEFAULT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
