# Cyber Fraud Intelligence Platform — Walkthrough

Production-structured cybersecurity fraud detection platform with React/Tailwind frontend, FastAPI backend, ML models, and MongoDB.

## Project Structure

```
Mini_Project/
├── run.py                    # Launch both servers
├── backend/
│   ├── app.py                # FastAPI entry (CORS, startup hooks)
│   ├── db.py                 # MongoDB + in-memory fallback
│   ├── requirements.txt
│   ├── routes/
│   │   ├── phishing.py       # POST /phishing/check
│   │   ├── bot_detector.py   # POST /bot/detect
│   │   ├── fraud_network.py  # POST /fraud/network
│   │   └── logs.py           # GET /logs
│   ├── models/
│   │   ├── phishing_model.py     # RandomForest (URL features)
│   │   ├── bot_detector.py       # RandomForest (txn features)
│   │   └── gnn_fraud_detector.py # PyTorch Geometric placeholder
│   ├── datasets/
│   │   └── generate_transactions.py  # 50k synthetic rows
│   └── preprocessing/
│       └── clean_transactions.py     # Feature engineering
├── frontend/
│   └── src/
│       ├── services/api.js   # Fetch client for all endpoints
│       ├── pages/
│       │   ├── Dashboard.jsx     # Stats + animated charts
│       │   ├── Phishing.jsx      # URL check → backend
│       │   ├── BotDetector.jsx   # Transaction check → backend
│       │   ├── FraudRing.jsx     # D3.js force-directed graph
│       │   └── IncidentLogs.jsx  # Live logs from MongoDB
│       └── components/
│           ├── Sidebar.jsx   # 5 nav links
│           ├── Navbar.jsx    # Theme toggle
│           └── Layout.jsx    # Outlet wrapper
```

## Key Features Built

| Feature | Tech | Details |
|---------|------|---------|
| Phishing Detection | RandomForest (scikit-learn) | 15 URL features: length, special chars, keywords, IP patterns |
| Bot Detection | RandomForest (scikit-learn) | 5 behavioral features: velocity, device changes, IP risk |
| Fraud Ring Graph | D3.js force-directed | 25 nodes, draggable, glow on suspicious, click for details |
| GNN Placeholder | PyTorch Geometric | FraudGNN class with GCNConv layers, ready for training |
| Dataset Generator | Pandas/NumPy | 50k synthetic transactions with 3% fraud rate |
| Incident Logging | MongoDB (PyMongo) | Auto-logs flagged phishing/bot results, with in-memory fallback |
| Animations | Framer Motion | Stagger animations, animated SVG gauges, fade-in effects |
| Theme | Tailwind CSS dark mode | Glass panels, neon glows, localStorage persistence |

## Verified Screenshots

### Dashboard — Backend Online indicator
![Dashboard](dashboard_verified_1773246601180.png)

### Phishing URL Checker — Real ML inference returning 68% risk
![Phishing Result](phishing_result_final_1773246667119.png)

### Bot Detector — Transaction analysis with fraud gauge
![Bot Detector](bot_detection_result_1773246693369.png)

### Fraud Ring Visualizer — D3.js graph with 25 nodes, 15 flagged
![Fraud Ring](fraud_ring_network_graph_1773246743730.png)

### Incident Logs — Live data from MongoDB with "Connected to backend"
![Incident Logs](incident_logs_table_1773246756886.png)

### Light Mode — Full theme toggle support
![Light Mode](light_mode_verification_1773246769160.png)

## How to Run

```bash
# Backend (Terminal 1)
cd backend
pip install -r requirements.txt
uvicorn app:app --reload       # → http://localhost:8000

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev                    # → http://localhost:5173

# Or use the convenience script:
python run.py
```

**API Docs**: http://localhost:8000/docs (auto-generated Swagger UI)
