-- ==============================================================================
-- JobGuard AI - Production Relational Database Schema
-- Target Engine: MySQL 8.4 (InnoDB, utf8mb4_unicode_ci)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `jobguard_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `jobguard_db`;

-- ------------------------------------------------------------------------------
-- Table 1: USERS
-- Manages authenticated user accounts and cryptographic password credentials
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(80) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(120) NOT NULL DEFAULT '',
    `organization` VARCHAR(150) NOT NULL DEFAULT '',
    `role` ENUM('user', 'analyst', 'admin') NOT NULL DEFAULT 'user',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_users_username` (`username`),
    UNIQUE KEY `uq_users_email` (`email`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 2: CAPTCHA_CHALLENGES
-- Manages cryptographic one-time CAPTCHA nonces for registration & login
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `captcha_challenges` (
    `id` VARCHAR(64) PRIMARY KEY,
    `solution_hash` VARCHAR(255) NOT NULL,
    `action` ENUM('register', 'login', 'scan') NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL DEFAULT '',
    `is_used` TINYINT(1) NOT NULL DEFAULT 0,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_captcha_action_expires` (`action`, `expires_at`),
    INDEX `idx_captcha_is_used` (`is_used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 3: SCAN_HISTORY
-- Stores comprehensive multi-engine job scam forensic dossiers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `scan_history` (
    `id` VARCHAR(64) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `job_title` VARCHAR(255) NOT NULL,
    `company_name` VARCHAR(255) NOT NULL,
    `job_description` MEDIUMTEXT NOT NULL,
    `application_url` VARCHAR(2048) DEFAULT NULL,
    `overall_risk_score` INT NOT NULL DEFAULT 0,
    `risk_level` ENUM('Low Risk', 'Moderate Risk', 'High Risk') NOT NULL DEFAULT 'Low Risk',
    
    -- Multi-engine Evidence Sub-Scores
    `ml_probability` DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    `url_probability` DECIMAL(6,4) DEFAULT NULL,
    `heuristic_score` DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
    `gemini_score` DECIMAL(6,4) DEFAULT NULL,
    
    -- Verification States
    `company_verification_status` ENUM('VERIFIED', 'NOT FOUND', 'MISMATCH', 'UNABLE TO VERIFY') NOT NULL DEFAULT 'UNABLE TO VERIFY',
    `vacancy_verification_status` ENUM('VERIFIED', 'NOT FOUND', 'CLOSED', 'EXPIRED', 'MISMATCH', 'UNABLE TO VERIFY') NOT NULL DEFAULT 'UNABLE TO VERIFY',
    `recruitment_status` ENUM('Active', 'Expired', 'Closed', 'Unable to Verify') NOT NULL DEFAULT 'Unable to Verify',
    `official_domain` VARCHAR(255) DEFAULT '',
    `careers_source` VARCHAR(1024) DEFAULT '',
    
    -- Forensic Breakdown Artifacts (JSON)
    `risk_breakdown_json` JSON NOT NULL,
    `matched_rules_json` JSON NOT NULL,
    `extracted_entities_json` JSON NOT NULL,
    `url_indicators_json` JSON DEFAULT NULL,
    `gemini_reasoning` TEXT DEFAULT NULL,
    `actionable_advice` TEXT NOT NULL,
    
    -- Metadata & Auditing
    `input_type` ENUM('manual', 'document_upload') NOT NULL DEFAULT 'manual',
    `file_type` VARCHAR(50) DEFAULT '',
    `client_ip` VARCHAR(45) DEFAULT '',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_scan_history_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX `idx_scan_history_user_created` (`user_id`, `created_at` DESC),
    INDEX `idx_scan_history_risk_level` (`risk_level`),
    INDEX `idx_scan_history_company` (`company_name`),
    INDEX `idx_scan_history_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 4: THREAT_INTEL_DOMAINS
-- Known malicious / deceptive TLD and domain intelligence cache
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `threat_intel_domains` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `domain_name` VARCHAR(255) NOT NULL,
    `category` ENUM('disposable_webmail', 'suspicious_tld', 'phishing_host', 'trusted_enterprise') NOT NULL,
    `threat_level` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `source` VARCHAR(100) NOT NULL DEFAULT 'academic_benchmark',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_threat_domain` (`domain_name`),
    INDEX `idx_threat_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 5: AUDIT_LOGS
-- Comprehensive immutable security event logging
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `details` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(500) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
