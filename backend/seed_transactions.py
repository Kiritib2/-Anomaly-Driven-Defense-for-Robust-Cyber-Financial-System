"""
Seed Script: Populate MongoDB with synthetic PaySim transactions.
Each transaction gets a unique ID (TXN-00001 to TXN-00500).
~80% are normal transactions, ~20% are injected fraud patterns.

Usage: python seed_transactions.py
"""
import numpy as np
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from db import get_db


def generate_paysim_transactions(n=500):
    """Generate PaySim-format transactions with unique IDs."""
    np.random.seed(42)
    
    type_names = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN']
    records = []
    
    n_normal = int(n * 0.8)
    n_fraud = n - n_normal
    
    # --- Normal Transactions ---
    for i in range(n_normal):
        txn_type = np.random.choice(type_names)
        amount = round(float(np.random.lognormal(mean=4.5, sigma=1.2)), 2)
        amount = max(10, min(amount, 500000))
        old_bal_org = round(float(np.random.lognormal(mean=6.0, sigma=1.5)), 2)
        new_bal_orig = round(max(0, old_bal_org - amount), 2)
        old_bal_dest = round(float(np.random.lognormal(mean=5.0, sigma=2.0)), 2)
        new_bal_dest = round(old_bal_dest + amount, 2)
        
        records.append({
            "transaction_id": f"TXN-{i+1:05d}",
            "step": int(np.random.randint(1, 744)),
            "type": txn_type,
            "amount": amount,
            "nameOrig": f"C{np.random.randint(100000000, 999999999)}",
            "oldbalanceOrg": old_bal_org,
            "newbalanceOrig": new_bal_orig,
            "nameDest": f"M{np.random.randint(100000000, 999999999)}",
            "oldbalanceDest": old_bal_dest,
            "newbalanceDest": new_bal_dest,
            "isFraud": 0,
            "isFlaggedFraud": 0,
        })
    
    # --- Fraud Transactions (account draining pattern) ---
    for i in range(n_fraud):
        txn_type = np.random.choice(['TRANSFER', 'CASH_OUT'])  # High-risk types
        amount = round(float(np.random.lognormal(mean=8.0, sigma=1.0)), 2)
        amount = max(1000, min(amount, 5000000))
        old_bal_org = amount  # Draining entire account
        new_bal_orig = 0.0
        old_bal_dest = round(float(np.random.lognormal(mean=3.0, sigma=1.0)), 2)
        new_bal_dest = round(old_bal_dest + amount, 2)
        
        records.append({
            "transaction_id": f"TXN-{n_normal + i + 1:05d}",
            "step": int(np.random.randint(1, 744)),
            "type": txn_type,
            "amount": amount,
            "nameOrig": f"C{np.random.randint(100000000, 999999999)}",
            "oldbalanceOrg": old_bal_org,
            "newbalanceOrig": new_bal_orig,
            "nameDest": f"C{np.random.randint(100000000, 999999999)}",
            "oldbalanceDest": old_bal_dest,
            "newbalanceDest": new_bal_dest,
            "isFraud": 1,
            "isFlaggedFraud": 1,
        })
    
    # Shuffle so fraud records aren't all at the end
    np.random.shuffle(records)
    
    # Assign flexible batch IDs (chunks of 50 to 70)
    batch_num = 1
    idx = 0
    while idx < len(records):
        chunk_size = np.random.randint(50, 71)
        for j in range(chunk_size):
            if idx + j < len(records):
                records[idx + j]["batch_id"] = f"BATCH-{batch_num:03d}"
        idx += chunk_size
        batch_num += 1
        
    return records


def seed():
    db = get_db()
    if db is None:
        print("❌ Cannot seed: MongoDB is not available. Make sure it's running!")
        sys.exit(1)
    
    # Drop existing transactions collection for a clean slate
    db.transactions.drop()
    print("🗑️  Cleared existing transactions collection.")
    
    records = generate_paysim_transactions(500)
    db.transactions.insert_many(records)
    
    # Create index on transaction_id for fast lookups
    db.transactions.create_index("transaction_id", unique=True)
    
    total = db.transactions.count_documents({})
    fraud = db.transactions.count_documents({"isFraud": 1})
    normal = total - fraud
    
    print(f"\n✅ Seeded {total} transactions into MongoDB!")
    print(f"   📊 Normal: {normal} | Fraud: {fraud}")
    print(f"\n💡 Sample IDs you can use:")
    
    # Show a few sample IDs
    samples = list(db.transactions.find({}, {"_id": 0, "transaction_id": 1, "type": 1, "amount": 1, "isFraud": 1}).limit(10))
    for s in samples:
        label = "🔴 FRAUD" if s["isFraud"] else "🟢 NORMAL"
        print(f"   {s['transaction_id']}  |  {s['type']:10s}  |  ₹{s['amount']:>12,.2f}  |  {label}")


if __name__ == "__main__":
    seed()
