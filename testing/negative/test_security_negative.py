"""
JobGuard AI - Negative & Security Boundary Testing
Methodology: Method 6 (Negative Testing Suite)
Verifies: Resistance to SQL injection patterns, malformed URLs, and boundary limits.
"""

import sys
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from ml.app.url_extractor import sanitize_and_validate_url


def test_sql_injection_payloads_in_url():
    payloads = [
        "https://example.com/apply?id=' OR '1'='1",
        "https://example.com/apply?id=1; DROP TABLE users; --",
        "https://example.com/apply?<script>alert(1)</script>"
    ]
    for p in payloads:
        valid, err, clean = sanitize_and_validate_url(p)
        # Even if parsed as HTTP URL, it must not crash or execute
        assert isinstance(valid, bool)


def test_disallowed_schemes_rejected():
    dangerous = [
        "javascript:alert(document.cookie)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "file:///etc/passwd",
        "vbscript:msgbox(1)",
        "ftp://anonymous@ftp.site.com"
    ]
    for url in dangerous:
        valid, err, clean = sanitize_and_validate_url(url)
        assert valid is False
        assert len(err) > 0


def test_oversized_url_rejected():
    huge_url = "https://example.com/" + ("a" * 4100)
    valid, err, clean = sanitize_and_validate_url(huge_url)
    assert valid is False
    assert "exceeds" in err.lower()


if __name__ == "__main__":
    test_sql_injection_payloads_in_url()
    test_disallowed_schemes_rejected()
    test_oversized_url_rejected()
    print("All negative security boundary tests PASSED!")
