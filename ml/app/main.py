"""
JobGuard AI - Machine Learning Inference Microservice
Module: ml.app.main
Framework: FastAPI (Python 3.12)
Purpose: Provides low-latency, deterministic REST endpoints for:
         1. EMSCAD Text Classification (TF-IDF + Logistic Regression)
         2. PhiUSIIL Phishing URL Threat Scoring (18 Structural Features + XGBoost)
         3. Passive URL Feature Extraction & Indicator Profiling
         4. Verified Research Evaluation Metrics
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from app.text_preprocessor import combine_job_fields
    from app.url_extractor import sanitize_and_validate_url, extract_phiusiil_18_features, URL_FEATURE_NAMES
except ImportError:
    from ml.app.text_preprocessor import combine_job_fields
    from ml.app.url_extractor import sanitize_and_validate_url, extract_phiusiil_18_features, URL_FEATURE_NAMES


# ------------------------------------------------------------------------------
# Application Initialization & Setup
# ------------------------------------------------------------------------------
app = FastAPI(
    title="JobGuard AI - Machine Learning Microservice",
    description="High-performance inference API serving trained models for job scam and phishing detection.",
    version="1.0.0"
)

# Enable CORS for local Node backend and frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

# Lazy-loaded model references
vectorizer = None
text_model = None
url_model = None


def load_artifacts():
    """
    Safely loads trained model binaries from ml/artifacts.
    """
    global vectorizer, text_model, url_model

    vec_file = ARTIFACTS_DIR / "vectorizer.joblib"
    txt_file = ARTIFACTS_DIR / "text_model.joblib"
    url_file = ARTIFACTS_DIR / "url_model.joblib"

    if vec_file.exists() and txt_file.exists():
        try:
            vectorizer = joblib.load(vec_file)
            text_model = joblib.load(txt_file)
        except Exception as exc:
            print(f"[ML Service] Error loading text model artifacts: {exc}")

    if url_file.exists():
        try:
            url_model = joblib.load(url_file)
        except Exception as exc:
            print(f"[ML Service] Error loading URL model artifact: {exc}")


@app.on_event("startup")
def startup_event():
    load_artifacts()


# ------------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ------------------------------------------------------------------------------
class TextPredictionRequest(BaseModel):
    title: Optional[str] = Field(default="", description="Job title / headline")
    company_profile: Optional[str] = Field(default="", description="Company overview / background")
    description: Optional[str] = Field(default="", description="Detailed vacancy description")
    requirements: Optional[str] = Field(default="", description="Required qualifications or candidate criteria")
    benefits: Optional[str] = Field(default="", description="Offered benefits, perks, or compensation details")


class TextPredictionResponse(BaseModel):
    probability: float = Field(..., description="Estimated probability of fraudulent job posting (0.000 to 1.000)")
    prediction: int = Field(..., description="Binary prediction: 1 = Fraudulent, 0 = Legitimate")
    risk_level: str = Field(..., description="Text-based risk level: Low, Moderate, or High")
    token_count: int = Field(..., description="Total combined words processed")


class UrlAnalysisRequest(BaseModel):
    url: str = Field(..., description="The application or recruitment link to analyze")


class UrlAnalysisResponse(BaseModel):
    clean_url: str
    probability: float = Field(..., description="Phishing / deceptive URL probability (0.000 to 1.000)")
    prediction: int = Field(..., description="Binary classification: 1 = Phishing, 0 = Legitimate")
    risk_level: str = Field(..., description="URL risk tier: Low, Moderate, or High")
    features: Dict[str, Any] = Field(..., description="The 18 extracted PhiUSIIL structural features")
    indicators: List[str] = Field(..., description="Forensic warnings and diagnostic signals")
    metadata: Dict[str, Any] = Field(..., description="Domain metadata (hostname, TLD, SSL, etc.)")


# ------------------------------------------------------------------------------
# REST API Endpoints
# ------------------------------------------------------------------------------
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Returns microservice health and status of loaded machine learning models.
    """
    text_ready = vectorizer is not None and text_model is not None
    url_ready = url_model is not None
    return {
        "status": "healthy" if (text_ready and url_ready) else "degraded",
        "service": "JobGuard AI ML Microservice",
        "models": {
            "text_scam_model_loaded": text_ready,
            "url_phishing_model_loaded": url_ready
        }
    }


@app.get("/metrics", status_code=status.HTTP_200_OK)
def get_metrics():
    """
    Returns the officially evaluated benchmark results from data/evaluation/.
    """
    text_metrics_file = ARTIFACTS_DIR / "text_metrics.json"
    url_metrics_file = ARTIFACTS_DIR / "url_metrics.json"

    result = {}
    if text_metrics_file.exists():
        with open(text_metrics_file, "r", encoding="utf-8") as f:
            result["emscad_text_model"] = json.load(f)
    if url_metrics_file.exists():
        with open(url_metrics_file, "r", encoding="utf-8") as f:
            result["phiusiil_url_model"] = json.load(f)

    return result


@app.post("/predict/text", response_model=TextPredictionResponse)
def predict_text(payload: TextPredictionRequest):
    """
    Transforms combined job text using sublinear TF-IDF and computes fraud probability
    via the calibrated Logistic Regression model.
    """
    if vectorizer is None or text_model is None:
        load_artifacts()
    if vectorizer is None or text_model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="EMSCAD text model artifacts are not initialized. Please run training pipeline first."
        )

    # 1. Normalize and combine fields
    unified_text = combine_job_fields(
        title=payload.title,
        company_profile=payload.company_profile,
        description=payload.description,
        requirements=payload.requirements,
        benefits=payload.benefits
    )

    if not unified_text:
        return TextPredictionResponse(
            probability=0.0,
            prediction=0,
            risk_level="Low",
            token_count=0
        )

    # 2. Vectorize via fitted TF-IDF
    features = vectorizer.transform([unified_text])

    # 3. Predict class probability (index 1 is fraudulent class)
    prob = float(text_model.predict_proba(features)[0, 1])
    pred = 1 if prob >= 0.50 else 0

    if prob >= 0.70:
        risk_lvl = "High"
    elif prob >= 0.40:
        risk_lvl = "Moderate"
    else:
        risk_lvl = "Low"

    tokens = len(unified_text.split())
    return TextPredictionResponse(
        probability=round(prob, 4),
        prediction=pred,
        risk_level=risk_lvl,
        token_count=tokens
    )


@app.post("/predict/url", response_model=UrlAnalysisResponse)
def predict_url(payload: UrlAnalysisRequest):
    """
    Extracts 18 structural features from raw application URL and scores phishing risk
    via the trained XGBoost classifier.
    """
    # 1. Validate and sanitize URL
    is_valid, err_msg, clean_url = sanitize_and_validate_url(payload.url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    # 2. Extract 18 structural features
    features, indicators, metadata = extract_phiusiil_18_features(clean_url)

    # 3. Compute ML probability if model is loaded
    if url_model is None:
        load_artifacts()

    prob = 0.0
    pred = 0
    if url_model is not None:
        # Build array adhering strictly to feature order
        feature_vector = np.array([[features[k] for k in URL_FEATURE_NAMES]])
        prob = float(url_model.predict_proba(feature_vector)[0, 1])
        pred = 1 if prob >= 0.50 else 0
    else:
        # Fallback to lexical indicator rule scoring if model not present
        if metadata.get("is_domain_ip") or metadata.get("has_suspicious_tld"):
            prob = 0.75
            pred = 1
        elif metadata.get("is_trusted_ats"):
            prob = 0.05
            pred = 0

    if prob >= 0.65:
        risk_lvl = "High"
    elif prob >= 0.35:
        risk_lvl = "Moderate"
    else:
        risk_lvl = "Low"

    return UrlAnalysisResponse(
        clean_url=clean_url,
        probability=round(prob, 4),
        prediction=pred,
        risk_level=risk_lvl,
        features=features,
        indicators=indicators,
        metadata=metadata
    )


@app.post("/features/url")
def extract_url_features_only(payload: UrlAnalysisRequest):
    """
    Passively extracts the 18 structural features and diagnostic findings without running inference.
    """
    is_valid, err_msg, clean_url = sanitize_and_validate_url(payload.url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )
    features, indicators, metadata = extract_phiusiil_18_features(clean_url)
    return {
        "clean_url": clean_url,
        "features": features,
        "indicators": indicators,
        "metadata": metadata
    }
