"""
JobGuard AI - Text Preprocessing & Ingestion Engine
Module: ml.app.text_preprocessor
Purpose: Normalizes unstructured job vacancy postings, strips unwanted control tokens,
         and combines relevant textual attributes aligned with EMSCAD dataset benchmark.
"""

import re
import unicodedata
from typing import Optional, Dict


TEXT_COLUMNS = ["title", "company_profile", "description", "requirements", "benefits"]


def clean_text_field(raw_text: Optional[str]) -> str:
    """
    Normalizes a single text string by applying Unicode decomposition,
    stripping HTML artifacts, and collapsing multi-space sequences.
    
    Algorithm:
    1. Replaces None / NaN with an empty string.
    2. Performs NFKD Unicode normalization to handle accented or special characters.
    3. Strips raw HTML tags using regex while preserving interior text.
    4. Replaces non-printable control characters with whitespace.
    5. Collapses redundant spaces, tabs, and newline characters into a single space.
    """
    if raw_text is None:
        return ""
    
    text = str(raw_text)
    # NFKD Unicode normalization
    text = unicodedata.normalize("NFKD", text)
    # Strip HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Replace non-printable characters
    text = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", text)
    # Collapse multiple whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def combine_job_fields(
    title: Optional[str] = "",
    company_profile: Optional[str] = "",
    description: Optional[str] = "",
    requirements: Optional[str] = "",
    benefits: Optional[str] = ""
) -> str:
    """
    Combines the 5 standard EMSCAD text fields into a single unified document string
    matching the input representation expected by the trained TF-IDF vectorizer.
    """
    parts = [
        clean_text_field(title),
        clean_text_field(company_profile),
        clean_text_field(description),
        clean_text_field(requirements),
        clean_text_field(benefits)
    ]
    # Join non-empty parts with space
    return " ".join([p for p in parts if p]).strip()
