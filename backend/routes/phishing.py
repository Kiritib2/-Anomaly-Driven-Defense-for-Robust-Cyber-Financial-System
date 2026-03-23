"""
Phishing URL Check API Route
POST /phishing/check
"""
from fastapi import APIRouter
from pydantic import BaseModel
from models.phishing_model import predict
from db import log_incident
from datetime import datetime

router = APIRouter(prefix="/phishing", tags=["Phishing Detection"])


class PhishingRequest(BaseModel):
    url: str


class PhishingResponse(BaseModel):
    phishing_score: float
    risk_level: str
    url: str
    features_extracted: int


@router.post("/check", response_model=PhishingResponse)
async def check_phishing(request: PhishingRequest):
    """Analyze a URL for phishing indicators."""
    result = predict(request.url)

    # Log high-risk URLs
    if result["phishing_score"] >= 50:
        log_incident({
            "account_id": "system",
            "transaction_id": f"URL-{hash(request.url) % 100000}",
            "fraud_probability": result["phishing_score"],
            "timestamp": datetime.utcnow().isoformat(),
            "model_version": "v1.0-phishing-rf",
            "action_taken": "blocked" if result["phishing_score"] >= 75 else "flagged",
            "threat_type": "phishing",
        })

    return PhishingResponse(**result)
