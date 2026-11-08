"""
JobGuard AI - Unit Tests: Consensus Risk Fusion (SRS Equation 3.1)
Verifies: Weight normalization, offline fallback, and critical advance-fee overrides.
"""

def compute_risk(H, M, U, G, has_critical_fee=False):
    has_url = U is not None
    has_gemini = G is not None

    w_h = 0.35
    w_m = 0.25
    w_u = 0.15 if has_url else 0.0
    w_g = 0.25 if has_gemini else 0.0

    total = w_h + w_m + w_u + w_g
    norm_h = w_h / total
    norm_m = w_m / total
    norm_u = w_u / total if has_url else 0.0
    norm_g = w_g / total if has_gemini else 0.0

    val_u = U if has_url else 0.0
    val_g = G if has_gemini else 0.0

    score = 100.0 * (norm_h * H + norm_m * M + norm_u * val_u + norm_g * val_g)
    if has_critical_fee and score < 85.0:
        score = 85.0

    return round(score)


def test_standard_four_stream_calculation():
    # H=0.8, M=0.7, U=0.9, G=0.6
    # 100 * (0.35*0.8 + 0.25*0.7 + 0.15*0.9 + 0.25*0.6) = 100 * (0.28 + 0.175 + 0.135 + 0.15) = 74
    score = compute_risk(0.8, 0.7, 0.9, 0.6)
    assert score == 74


def test_missing_url_normalizes_weights():
    # When U is None, total weight is 0.35 + 0.25 + 0.25 = 0.85
    score = compute_risk(0.5, 0.5, None, 0.5)
    assert score == 50


def test_advance_fee_override_enforces_minimum_85():
    # Even if ML models predict low probability, an upfront fee demand forces score >= 85
    score = compute_risk(0.4, 0.1, 0.0, 0.1, has_critical_fee=True)
    assert score >= 85
