# MongoDB Batch ID Bot Detection

## Goal
Allow the user to input a `batch_id` (e.g. `BATCH-001`) to automatically fetch and analyze a large group of predefined transactions from MongoDB, bypassing the need for CSV uploads.

## Proposed Changes

### 1. Seeding Script Update
#### [MODIFY] [backend/seed_transactions.py](file:///c:/Users/Kiriti/Desktop/Mini_Project/backend/seed_transactions.py)
- Add a `batch_id` field to the synthetic PaySim transactions.
- Group the 500 transactions into 10 batches of 50 (e.g., `BATCH-001` to `BATCH-010`).

### 2. Database Lookup
#### [MODIFY] [backend/db.py](file:///c:/Users/Kiriti/Desktop/Mini_Project/backend/db.py)
- Add `get_transactions_by_batch(batch_id)` to query all transactions matching the provided `batch_id`.

### 3. Model Logic
#### [MODIFY] [backend/models/bot_detector.py](file:///c:/Users/Kiriti/Desktop/Mini_Project/backend/models/bot_detector.py)
- Add `predict_by_batch_id(batch_id: str)`.
- It will fetch the transactions from MongoDB, convert them to a pandas DataFrame, and pass it cleanly into the existing [predict_batch(df)](file:///c:/Users/Kiriti/Desktop/Mini_Project/backend/models/bot_detector.py#133-174) function.

### 4. API Route
#### [MODIFY] [backend/routes/bot_detector.py](file:///c:/Users/Kiriti/Desktop/Mini_Project/backend/routes/bot_detector.py)
- Add an endpoint `POST /bot/detect-batch` that accepts `{"batch_id": "BATCH-001"}`.
- It will return the full batch analysis (High-risk transaction table, stats) identical to the CSV upload result.
