-- ==============================================================================
-- JobGuard AI - Database Initialization & Seed Taxonomy
-- Strictly NO fake jobs, dummy applicants, or fictional demonstration records.
-- Seeds only verified cybersecurity taxonomy and recognized recruitment infrastructure.
-- ==============================================================================

USE `jobguard_db`;

-- Seed Verified Enterprise Recruitment Infrastructure (ATS & Legitimate Platforms)
INSERT IGNORE INTO `threat_intel_domains` (`domain_name`, `category`, `threat_level`, `notes`, `source`) VALUES
('greenhouse.io', 'trusted_enterprise', 'low', 'Verified Applicant Tracking System (ATS)', 'academic_benchmark'),
('lever.co', 'trusted_enterprise', 'low', 'Verified Applicant Tracking System (ATS)', 'academic_benchmark'),
('myworkdayjobs.com', 'trusted_enterprise', 'low', 'Verified Enterprise Recruitment Portal', 'academic_benchmark'),
('smartrecruiters.com', 'trusted_enterprise', 'low', 'Verified ATS Recruitment Platform', 'academic_benchmark'),
('icims.com', 'trusted_enterprise', 'low', 'Verified Talent Acquisition Cloud', 'academic_benchmark'),
('ashbyhq.com', 'trusted_enterprise', 'low', 'Verified Hiring & Recruitment Platform', 'academic_benchmark'),
('jobvite.com', 'trusted_enterprise', 'low', 'Verified Enterprise ATS', 'academic_benchmark'),
('linkedin.com', 'trusted_enterprise', 'low', 'Professional Network & Job Portal', 'academic_benchmark'),
('indeed.com', 'trusted_enterprise', 'low', 'Global Recruitment Search Engine', 'academic_benchmark'),
('glassdoor.com', 'trusted_enterprise', 'low', 'Verified Employer Reviews and Jobs', 'academic_benchmark');

-- Seed Known High-Risk Phishing / Ephemeral Hosting Platforms
INSERT IGNORE INTO `threat_intel_domains` (`domain_name`, `category`, `threat_level`, `notes`, `source`) VALUES
('xsph.ru', 'phishing_host', 'high', 'Frequently abused Russian shared host', 'PhiUSIIL_study'),
('000webhostapp.com', 'phishing_host', 'high', 'Free shared web hosting frequently abused for phishing', 'PhiUSIIL_study'),
('ngrok.io', 'phishing_host', 'medium', 'Tunneling platform used for ephemeral credential harvesting', 'PhiUSIIL_study'),
('duckdns.org', 'phishing_host', 'high', 'Dynamic DNS platform abused for phishing redirects', 'PhiUSIIL_study'),
('zapto.org', 'phishing_host', 'high', 'Free dynamic DNS used in temporary scam staging', 'PhiUSIIL_study');

-- Seed Known Suspicious Top-Level Domains (TLDs)
INSERT IGNORE INTO `threat_intel_domains` (`domain_name`, `category`, `threat_level`, `notes`, `source`) VALUES
('.xyz', 'suspicious_tld', 'medium', 'Disproportionately represented in low-cost scam domains', 'PhiUSIIL_study'),
('.top', 'suspicious_tld', 'high', 'Extensively observed in phishing campaigns', 'PhiUSIIL_study'),
('.icu', 'suspicious_tld', 'high', 'Predominantly associated with automated scam generation', 'PhiUSIIL_study'),
('.work', 'suspicious_tld', 'medium', 'Commonly registered to impersonate corporate portals', 'PhiUSIIL_study'),
('.buzz', 'suspicious_tld', 'high', 'Abused bulk registration TLD', 'PhiUSIIL_study'),
('.tk', 'suspicious_tld', 'high', 'Free TLD historically leveraged for malicious campaigns', 'PhiUSIIL_study');
