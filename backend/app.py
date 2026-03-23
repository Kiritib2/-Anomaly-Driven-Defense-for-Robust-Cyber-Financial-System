"""
Cyber Fraud Intelligence Platform — FastAPI Backend
Main application entry point.
"""
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routes.phishing import router as phishing_router
from routes.bot_detector import router as bot_router
from routes.fraud_network import router as fraud_router
from routes.logs import router as logs_router
from routes.threat_workflow import router as threat_router
from routes.dashboard import router as dashboard_router

app = FastAPI(
    title="Cyber Fraud Intelligence Platform",
    description="AI-powered cybersecurity fraud detection with phishing, bot, and fraud ring analysis.",
    version="1.0.0",
)

# CORS — allow frontend dev server and extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(phishing_router)
app.include_router(bot_router)
app.include_router(fraud_router)
app.include_router(logs_router)
app.include_router(threat_router)
app.include_router(dashboard_router)


@app.on_event("startup")
async def startup():
    """Initialize models and generate dataset on startup."""
    print("\n🚀 Cyber Fraud Intelligence Platform Starting...\n")

    # Generate dataset if not exists
    dataset_path = os.path.join(os.path.dirname(__file__), "datasets", "bank_transactions.csv")
    if not os.path.exists(dataset_path):
        print("📊 Generating synthetic dataset...")
        from datasets.generate_transactions import generate_transactions
        generate_transactions()

    # Pre-train models
    print("\n🧠 Loading ML models...")
    from models.phishing_model import get_model as get_phishing_model
    from models.bot_detector import get_model as get_bot_model
    get_phishing_model()
    get_bot_model()

    # Test MongoDB connection (non-blocking — app still starts if DB is down)
    from db import get_db
    db = get_db()
    if db is not None:
        print("✅ MongoDB connected successfully.")
    else:
        print("⚠️  MongoDB not available — database features will be limited until it comes online.")

    print("\n✅ Platform ready!\n")


@app.get("/")
async def root():
    return {
        "name": "Cyber Fraud Intelligence Platform",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": [
            "POST /phishing/check",
            "POST /bot/detect",
            "POST /fraud/network",
            "GET /logs",
            "POST /threat/analyze"
        ]
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
