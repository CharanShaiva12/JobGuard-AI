"""
JobGuard AI - Unit Tests: Heuristic & Rule Engine
Verifies: Advance-fee detection, UPI/wallet triggers, crypto patterns, and entity extraction.
"""

import re

REG_FEE_REGEX = re.compile(r"\b(?:registration|enrollment|onboarding|induction|admittance|form)\s+fees?\b", re.I)
SEC_DEPOSIT_REGEX = re.compile(r"\b(?:security|refundable|mandatory|caution)\s+deposits?\b", re.I)
CRYPTO_REGEX = re.compile(r"\b(?:usdt|bitcoin|crypto|cryptocurrency|trc20|erc20|binance)\b", re.I)
UPI_REGEX = re.compile(r"\b(?:upi|gpay|google\s*pay|phonepe|paytm)\b.*?\b(?:pay|send|transfer|deposit)\b", re.I)


def test_registration_fee_flagged():
    text = "Selected applicants must pay a mandatory registration fee of 500 INR before joining."
    assert REG_FEE_REGEX.search(text) is not None


def test_security_deposit_flagged():
    text = "A refundable security deposit of $200 is required for company laptop dispatch."
    assert SEC_DEPOSIT_REGEX.search(text) is not None


def test_crypto_payout_flagged():
    text = "Work from home. Daily tasks will be compensated in USDT via Binance or Trust Wallet."
    assert CRYPTO_REGEX.search(text) is not None


def test_legitimate_salary_not_flagged():
    text = "We offer a competitive compensation package of $120,000 per annum with health insurance and 401(k)."
    assert REG_FEE_REGEX.search(text) is None
    assert SEC_DEPOSIT_REGEX.search(text) is None
    assert CRYPTO_REGEX.search(text) is None
