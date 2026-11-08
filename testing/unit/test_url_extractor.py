"""
JobGuard AI - Unit Tests: URL Feature Extractor
Methodology: Method 2 (pytest)
Verifies: 18 URL features, protocol handling, safe parsing, and indicator detection.
"""

import pytest
from ml.app.url_extractor import sanitize_and_validate_url, extract_phiusiil_18_features, URL_FEATURE_NAMES


def test_valid_http_and_https_urls():
    valid, err, clean = sanitize_and_validate_url("https://careers.google.com/jobs/results")
    assert valid is True
    assert clean.startswith("https://")
    assert err == ""


def test_missing_scheme_defaults_to_https():
    valid, err, clean = sanitize_and_validate_url("greenhouse.io/company/role")
    assert valid is True
    assert clean == "https://greenhouse.io/company/role"


def test_disallowed_dangerous_schemes():
    valid, err, clean = sanitize_and_validate_url("javascript:alert(1)")
    assert valid is False
    assert "dangerous" in err.lower() or "unsupported" in err.lower()


def test_phiusiil_18_features_order_and_keys():
    url = "https://sub.portal.xyz/apply?token=test%20123&verify=1"
    features, indicators, meta = extract_phiusiil_18_features(url)

    # Must contain exactly the 18 configured features
    for name in URL_FEATURE_NAMES:
        assert name in features, f"Missing feature {name}"

    assert features["URLLength"] == len(url)
    assert features["IsHTTPS"] == 1
    assert features["HasObfuscation"] == 1
    assert features["NoOfObfuscatedChar"] == 1
    assert features["NoOfEqualsInURL"] == 2
    assert features["NoOfAmpersandInURL"] == 1
    assert features["NoOfQMarkInURL"] == 1


def test_ip_address_host_detection():
    url = "http://192.168.1.1/careers/apply"
    features, indicators, meta = extract_phiusiil_18_features(url)
    assert features["IsDomainIP"] == 1
    assert features["IsHTTPS"] == 0
    assert any("direct IP" in ind for ind in indicators)


def test_trusted_ats_classification():
    url = "https://boards.greenhouse.io/stripe/jobs/12345"
    features, indicators, meta = extract_phiusiil_18_features(url)
    assert meta["is_trusted_ats"] is True
    assert any("Recognized recruitment" in ind for ind in indicators)
