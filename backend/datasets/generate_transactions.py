"""
Synthetic Banking Transaction Dataset Generator
Generates ~50k realistic banking transactions for ML training.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
import uuid


def generate_transactions(n_transactions=50000, output_path=None):
    """Generate synthetic banking transactions following realistic rules."""
    np.random.seed(42)

    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "bank_transactions.csv")

    print(f"🔄 Generating {n_transactions} synthetic transactions...")

    # Generate accounts
    n_accounts = n_transactions // 10  # ~10 txns per account on average
    account_ids = [f"ACC-{str(i).zfill(6)}" for i in range(n_accounts)]
    account_ages = np.random.randint(1, 3650, n_accounts)  # 1 day to 10 years
    account_devices = {acc: [f"DEV-{uuid.uuid4().hex[:8]}"] for acc in account_ids}

    # Merchants
    merchants = [f"MER-{str(i).zfill(4)}" for i in range(200)]
    locations = [
        'New York', 'London', 'Mumbai', 'Tokyo', 'Sydney',
        'Berlin', 'Paris', 'Toronto', 'Singapore', 'Dubai',
        'São Paulo', 'Moscow', 'Seoul', 'Lagos', 'Cairo'
    ]

    # IP pools
    safe_ips = [f"10.{np.random.randint(0,255)}.{np.random.randint(0,255)}.{np.random.randint(1,254)}"
                for _ in range(500)]
    risky_ips = [f"{np.random.randint(45,200)}.{np.random.randint(1,255)}.{np.random.randint(1,255)}.{np.random.randint(1,254)}"
                 for _ in range(50)]

    records = []
    start_date = datetime(2023, 1, 1)
    fraud_rate = 0.03  # 3% fraud rate

    for i in range(n_transactions):
        acc_idx = np.random.randint(0, n_accounts)
        account_id = account_ids[acc_idx]
        is_fraud = np.random.random() < fraud_rate

        if is_fraud:
            # Fraudulent transaction patterns
            amount = np.random.choice([
                np.random.uniform(5000, 50000),  # Large withdrawals
                np.random.uniform(0.01, 5),       # Micro-transactions (testing)
                np.random.lognormal(8, 0.5),      # Extreme amounts
            ], p=[0.4, 0.3, 0.3])
            # Suspicious burst: multiple txns in short time
            timestamp = start_date + timedelta(
                days=np.random.randint(0, 365),
                hours=np.random.randint(1, 5),  # Night hours
                minutes=np.random.randint(0, 60),
                seconds=np.random.randint(0, 60)
            )
            ip = np.random.choice(risky_ips)
            device_id = f"DEV-{uuid.uuid4().hex[:8]}"  # New device
            location = np.random.choice(['Unknown', 'VPN', 'TOR'] + locations[:3])
        else:
            # Normal transaction patterns
            amount = np.random.lognormal(mean=3.5, sigma=1.2)
            amount = np.clip(amount, 1, 10000)
            timestamp = start_date + timedelta(
                days=np.random.randint(0, 365),
                hours=np.random.randint(6, 23),  # Daytime
                minutes=np.random.randint(0, 60),
                seconds=np.random.randint(0, 60)
            )
            ip = np.random.choice(safe_ips)
            # Usually same device
            device_id = account_devices[account_id][0]
            if np.random.random() < 0.05:  # 5% chance of device change
                device_id = f"DEV-{uuid.uuid4().hex[:8]}"
                account_devices[account_id].append(device_id)
            location = np.random.choice(locations)

        records.append({
            'account_id': account_id,
            'transaction_id': f"TXN-{uuid.uuid4().hex[:12].upper()}",
            'amount': round(amount, 2),
            'timestamp': timestamp.isoformat(),
            'device_id': device_id,
            'ip_address': ip,
            'merchant_id': np.random.choice(merchants),
            'location': location,
            'is_fraud': int(is_fraud),
        })

    df = pd.DataFrame(records)
    df = df.sort_values('timestamp').reset_index(drop=True)
    df.to_csv(output_path, index=False)

    fraud_count = df['is_fraud'].sum()
    print(f"✅ Generated {len(df)} transactions ({fraud_count} fraudulent, {fraud_count/len(df)*100:.1f}%)")
    print(f"   Saved to: {output_path}")
    return df


if __name__ == "__main__":
    generate_transactions()
