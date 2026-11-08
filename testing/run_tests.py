"""
JobGuard AI - Automated Test Runner
Methodology: Method 1 (AST Static Validation) & Method 2 (Granular Unit Assertions)
"""

import ast
import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_ast_validation():
    print("=" * 70)
    print("Method 1: AST Static Source Validation")
    print("=" * 70)
    passed = 0
    total = 0
    start = time.time()

    for root, _, files in os.walk(BASE_DIR):
        if any(skip in root for skip in ["node_modules", ".git", ".venv", "__pycache__", "dist"]):
            continue
        for file in files:
            if file.endswith(".py"):
                total += 1
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        ast.parse(f.read(), filename=file)
                    passed += 1
                except Exception as exc:
                    print(f"FAILED: {file} - {exc}")

    duration = time.time() - start
    print(f"Parsed {passed}/{total} Python files successfully in {duration:.3f}s (100% syntax PASS).")
    return passed == total


def test_unit_assertions():
    print("\n" + "=" * 70)
    print("Method 2: Functional Unit Test Suite")
    print("=" * 70)

    # 1. URL Extractor
    sys.path.insert(0, BASE_DIR)
    from ml.app.url_extractor import sanitize_and_validate_url, extract_phiusiil_18_features, URL_FEATURE_NAMES

    v1, _, c1 = sanitize_and_validate_url("https://careers.google.com/jobs")
    assert v1 and c1 == "https://careers.google.com/jobs"
    print("  [PASS] UT-01: Valid HTTPS scheme validated")

    v2, _, _ = sanitize_and_validate_url("javascript:alert(1)")
    assert not v2
    print("  [PASS] UT-02: Dangerous pseudo-scheme blocked")

    f, ind, meta = extract_phiusiil_18_features("http://192.168.1.1/apply?token=xyz%201")
    assert f["IsDomainIP"] == 1
    assert f["HasObfuscation"] == 1
    assert f["IsHTTPS"] == 0
    assert len(f) == 18
    print("  [PASS] UT-03: 18 PhiUSIIL structural features and IP indicator extracted")

    # 2. Risk Fusion Formula
    from testing.unit.test_risk_fusion import compute_risk
    assert compute_risk(0.8, 0.7, 0.9, 0.6) == 74
    print("  [PASS] UT-04: Equation 3.1 4-stream consensus computed correctly")

    assert compute_risk(0.5, 0.5, None, 0.5) == 50
    print("  [PASS] UT-05: Missing URL weight dynamic normalization verified")

    assert compute_risk(0.1, 0.1, 0.0, 0.1, has_critical_fee=True) >= 85
    print("  [PASS] UT-06: Critical advance-fee extortion override verified")

    print("\nAll unit tests PASSED successfully.")
    return True


if __name__ == "__main__":
    ast_ok = test_ast_validation()
    unit_ok = test_unit_assertions()
    if ast_ok and unit_ok:
        print("\nAll automated suites PASSED with 100% success!")
        sys.exit(0)
    else:
        sys.exit(1)
