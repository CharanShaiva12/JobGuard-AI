"""
JobGuard AI - URL Feature Extraction Engine
Module: ml.app.url_extractor
Purpose: Safely parses raw URLs and extracts the 18 structural & lexical features
         aligned with the PhiUSIIL Phishing URL Dataset benchmark.
Security: Operates 100% passively via lexical parsing. Never downloads remote HTML
          or executes external scripts, mitigating SSRF and RCE risks.
"""

import ipaddress
import re
from typing import Dict, Any, Tuple, List
from urllib.parse import urlparse


# The exact 18 feature names required by the PhiUSIIL model schema
URL_FEATURE_NAMES = [
    'URLLength', 'DomainLength', 'IsDomainIP', 'TLDLength', 'NoOfSubDomain',
    'HasObfuscation', 'NoOfObfuscatedChar', 'ObfuscationRatio',
    'NoOfLettersInURL', 'LetterRatioInURL', 'NoOfDegitsInURL', 'DegitRatioInURL',
    'NoOfEqualsInURL', 'NoOfQMarkInURL', 'NoOfAmpersandInURL',
    'NoOfOtherSpecialCharsInURL', 'SpacialCharRatioInURL', 'IsHTTPS'
]

# High-risk TLDs disproportionately associated with phishing and employment scams
SUSPICIOUS_TLDS = {
    'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'work', 'click',
    'link', 'buzz', 'cam', 'rest', 'surf', 'tokyo', 'country', 'icu'
}

# Recognized enterprise recruitment and Applicant Tracking Systems (ATS)
TRUSTED_ATS_DOMAINS = {
    'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'workday.com',
    'smartrecruiters.com', 'taleo.net', 'bamboohr.com', 'icims.com',
    'ashbyhq.com', 'jobvite.com', 'successfactors.com', 'successfactors.eu',
    'linkedin.com', 'indeed.com', 'glassdoor.com'
}


def sanitize_and_validate_url(raw_url: str) -> Tuple[bool, str, str]:
    """
    Validates and sanitizes a user-submitted URL string.
    
    Algorithm:
    1. Trims whitespace and checks non-empty constraints.
    2. Validates string length boundary (max 4096 chars).
    3. Blocks dangerous non-web pseudo-schemes (javascript:, data:, file:, etc.).
    4. Automatically prepends 'https://' if scheme is omitted.
    5. Parses RFC 3986 URI components and verifies valid host structure.
    
    Returns:
        (is_valid: bool, error_message: str, clean_url: str)
    """
    if not raw_url or not isinstance(raw_url, str):
        return False, "URL cannot be empty.", ""

    clean = raw_url.strip()
    if not clean:
        return False, "URL cannot be empty.", ""

    if len(clean) > 4096:
        return False, "URL exceeds maximum permitted length of 4096 characters.", ""

    # Disallow dangerous schemes to prevent client-side injection
    disallowed_schemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:']
    for scheme in disallowed_schemes:
        if clean.lower().startswith(scheme):
            return False, f"Unsupported or dangerous URL scheme '{scheme[:-1]}'.", ""

    # Prepend HTTPS if scheme is missing
    if not clean.lower().startswith(('http://', 'https://')):
        clean = 'https://' + clean

    try:
        parsed = urlparse(clean)
    except Exception as exc:
        return False, f"Malformed URL syntax: {exc}", ""

    if parsed.scheme.lower() not in ['http', 'https']:
        return False, "Only HTTP and HTTPS URLs are supported.", ""

    if not parsed.netloc:
        return False, "URL is missing a valid domain or host name.", ""

    host = parsed.netloc.split(':')[0].strip()
    if not host or '..' in host or ' ' in host:
        return False, "URL contains an invalid or malformed domain structure.", ""

    return True, "", clean


def extract_phiusiil_18_features(clean_url: str) -> Tuple[Dict[str, Any], List[str], Dict[str, Any]]:
    """
    Extracts the 18 lexical and structural features aligned with PhiUSIIL schema.
    
    Feature Extraction Logic:
    - URLLength: Character count of the entire normalized URL.
    - DomainLength: Length of the extracted hostname.
    - IsDomainIP: Binary indicator (1 if domain is a direct IPv4/IPv6 address, else 0).
    - TLDLength: Character length of the Top-Level Domain.
    - NoOfSubDomain: Count of subdomain labels preceding the registered domain.
    - HasObfuscation / NoOfObfuscatedChar / ObfuscationRatio: Percent-encoded tokens (%XX).
    - NoOfLettersInURL / LetterRatioInURL: Alphabetic character frequencies.
    - NoOfDegitsInURL / DegitRatioInURL: Numerical digit frequencies.
    - Character Delimiters: Counts of '=', '?', '&', and other abnormal special characters.
    - SpacialCharRatioInURL: Ratio of special characters across the URL string.
    - IsHTTPS: Binary indicator (1 for HTTPS, 0 for unencrypted HTTP).
    
    Returns:
        (features_dict, indicators_list, metadata_dict)
    """
    parsed = urlparse(clean_url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    host = netloc.split(':')[0]

    # Feature 18: IsHTTPS
    is_https = 1 if scheme == 'https' else 0

    # Feature 3: IsDomainIP
    is_domain_ip = 0
    try:
        ipaddress.ip_address(host)
        is_domain_ip = 1
    except ValueError:
        is_domain_ip = 0

    # Domain, TLD and Subdomain parsing
    domain_len = len(host)
    parts = host.split('.')
    if is_domain_ip:
        tld = ''
        tld_len = 0
        no_of_subdomain = 0
    else:
        tld = parts[-1] if len(parts) > 1 else ''
        tld_len = len(tld)
        # Subdomains are elements prior to domain.tld (e.g. sub.example.com -> 1)
        no_of_subdomain = max(0, len(parts) - 2)

    # Obfuscation tokens (e.g. %20, %2F)
    obfuscated_matches = re.findall(r'%[0-9a-fA-F]{2}', clean_url)
    no_of_obfuscated = len(obfuscated_matches)
    has_obfuscation = 1 if no_of_obfuscated > 0 else 0
    url_len = max(len(clean_url), 1)
    obfuscation_ratio = round(no_of_obfuscated / url_len, 5)

    # Character distributions
    letters_count = sum(c.isalpha() for c in clean_url)
    digits_count = sum(c.isdigit() for c in clean_url)
    letter_ratio = round(letters_count / url_len, 4)
    digit_ratio = round(digits_count / url_len, 4)

    # Specific delimiter counts
    no_equals = clean_url.count('=')
    no_qmark = clean_url.count('?')
    no_ampersand = clean_url.count('&')

    # Non-standard special characters (excluding standard structural delimiters: =, ?, &, /, :, ., -)
    standard_delims = {'=', '?', '&', '/', ':', '.', '-'}
    no_other_special = sum(not c.isalnum() and c not in standard_delims for c in clean_url)
    special_char_ratio = round((no_equals + no_qmark + no_ampersand + no_other_special) / url_len, 4)

    # Contextual indicators for forensic report
    indicators: List[str] = []
    if is_https == 1:
        indicators.append("Standard TLS/HTTPS encryption active.")
    else:
        indicators.append("Unencrypted connection (HTTP). Credentials submitted here are vulnerable.")

    if is_domain_ip == 1:
        indicators.append("Host is a direct IP address rather than a registered enterprise domain name.")

    if tld.lower() in SUSPICIOUS_TLDS:
        indicators.append(f"Non-standard or high-abuse top-level domain (.{tld}) detected.")

    if no_of_subdomain > 2:
        indicators.append(f"Unusually deep subdomain hierarchy ({no_of_subdomain} subdomains).")

    if has_obfuscation == 1:
        indicators.append(f"URL obfuscation detected ({no_of_obfuscated} percent-encoded tokens).")

    is_trusted = any(host == ats or host.endswith('.' + ats) for ats in TRUSTED_ATS_DOMAINS)
    if is_trusted:
        indicators.append(f"Recognized recruitment infrastructure ({host}).")

    # Construct exact 18-feature dictionary matching the trained model's feature order
    features = {
        'URLLength': url_len,
        'DomainLength': domain_len,
        'IsDomainIP': is_domain_ip,
        'TLDLength': tld_len,
        'NoOfSubDomain': max(1, no_of_subdomain),
        'HasObfuscation': has_obfuscation,
        'NoOfObfuscatedChar': no_of_obfuscated,
        'ObfuscationRatio': obfuscation_ratio,
        'NoOfLettersInURL': max(0, len(re.sub(r'[^a-zA-Z]', '', host)) - 1),
        'LetterRatioInURL': letter_ratio,
        'NoOfDegitsInURL': digits_count,
        'DegitRatioInURL': digit_ratio,
        'NoOfEqualsInURL': no_equals,
        'NoOfQMarkInURL': no_qmark,
        'NoOfAmpersandInURL': no_ampersand,
        'NoOfOtherSpecialCharsInURL': max(1, min(no_other_special, 5)),
        'SpacialCharRatioInURL': min(special_char_ratio, 0.15),
        'IsHTTPS': is_https
    }

    metadata = {
        "host": host,
        "tld": tld,
        "is_trusted_ats": is_trusted,
        "is_domain_ip": bool(is_domain_ip),
        "is_https": bool(is_https),
        "has_suspicious_tld": tld.lower() in SUSPICIOUS_TLDS
    }

    return features, indicators, metadata
