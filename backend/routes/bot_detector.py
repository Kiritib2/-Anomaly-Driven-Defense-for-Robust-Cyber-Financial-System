"""
Bot Detection API Route
POST /bot/detect
POST /bot/detect-batch
POST /bot/upload
GET  /bot/batches
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from models.bot_detector import predict_by_transaction_id, predict_batch, predict_by_batch_id
from db import log_incident, get_available_batches
from datetime import datetime
import pandas as pd
import io

router = APIRouter(prefix="/bot", tags=["Bot Detection"])


class BotDetectRequest(BaseModel):
    transaction_id: str


class BatchDetectRequest(BaseModel):
    batch_id: str


class BotDetectResponse(BaseModel):
    transaction_id: str
    fraud_probability: float
    is_bot: bool
    confidence: float
    features_used: list
    transaction_type: str = "UNKNOWN"
    amount: float = 0.0
    source_account: str = "N/A"
    dest_account: str = "N/A"


@router.post("/detect", response_model=BotDetectResponse)
async def detect_bot(request: BotDetectRequest):
    """Detect automated bot activity for a given transaction."""
    result = predict_by_transaction_id(request.transaction_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Transaction '{request.transaction_id}' not found in database. Use IDs like TXN-00001 to TXN-00500."
        )

    # Log flagged transactions
    if result["fraud_probability"] >= 50:
        log_incident({
            "account_id": result.get("source_account", f"ACC-{hash(request.transaction_id) % 10000:06d}"),
            "transaction_id": request.transaction_id,
            "fraud_probability": result["fraud_probability"],
            "timestamp": datetime.utcnow().isoformat(),
            "model_version": "v2.0-paysim-rf",
            "action_taken": "blocked" if result["is_bot"] else "flagged",
            "threat_type": "bot_activity",
        })

    return BotDetectResponse(**result)


@router.post("/detect-batch")
async def detect_batch(request: BatchDetectRequest):
    """Analyze all transactions in a batch by batch_id from MongoDB."""
    result = predict_by_batch_id(request.batch_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Batch '{request.batch_id}' not found in database. Use IDs like BATCH-001 to BATCH-010."
        )

    # Log flagged transactions from batch
    if result.get('flagged_transactions'):
        for flag in result['flagged_transactions'][:5]:
            log_incident({
                "account_id": f"BATCH-{request.batch_id}",
                "transaction_id": flag["transaction_id"],
                "fraud_probability": flag["fraud_probability"],
                "timestamp": datetime.utcnow().isoformat(),
                "model_version": "v2.0-paysim-rf",
                "action_taken": "flagged",
                "threat_type": "batch_bot_activity",
            })

    return result


@router.get("/batches")
async def list_batches():
    """List all available batch IDs with transaction counts."""
    batches = get_available_batches()
    return {"batches": batches, "total": len(batches)}


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a PaySim-style CSV dataset for batch bot processing."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Verify PaySim schema columns loosely exist
        if 'amount' not in df.columns or ('oldbalanceOrg' not in df.columns and 'oldbalanceOrig' not in df.columns):
             raise HTTPException(status_code=400, detail="CSV does not match PaySim schema (missing amount or oldbalanceOrg).")
        
        # Standardize column typo in original dataset if present
        if 'oldbalanceOrg' not in df.columns and 'oldbalanceOrig' in df.columns:
            df.rename(columns={'oldbalanceOrig': 'oldbalanceOrg'}, inplace=True)
            
        result = predict_batch(df)
        
        # Log some incident samples to MongoDB
        if result['flagged_transactions']:
            for flag in result['flagged_transactions'][:5]:
                log_incident({
                    "account_id": "BATCH-UPLOAD",
                    "transaction_id": flag["transaction_id"],
                    "fraud_probability": flag["fraud_probability"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "model_version": "v2.0-paysim-rf",
                    "action_taken": "flagged",
                    "threat_type": "bulk_bot_activity",
                })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
