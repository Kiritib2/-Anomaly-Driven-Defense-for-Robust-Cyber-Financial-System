"""
Transaction Data Preprocessing Module
Handles cleaning, normalization, encoding, and feature derivation.
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
import os


def clean_and_preprocess(df: pd.DataFrame = None, csv_path: str = None) -> pd.DataFrame:
    """
    Clean and preprocess transaction data.

    Steps:
    1. Handle missing values
    2. Normalize transaction amounts
    3. Encode categorical variables
    4. Create derived features
    """
    if df is None and csv_path is not None:
        df = pd.read_csv(csv_path)
    elif df is None:
        default_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "bank_transactions.csv")
        if os.path.exists(default_path):
            df = pd.read_csv(default_path)
        else:
            raise FileNotFoundError("No dataset provided or found at default path.")

    print(f"🔄 Preprocessing {len(df)} transactions...")

    # 1. Handle Missing Values
    df['amount'] = df['amount'].fillna(df['amount'].median())
    df['location'] = df['location'].fillna('Unknown')
    df['device_id'] = df['device_id'].fillna('UNKNOWN')
    df['ip_address'] = df['ip_address'].fillna('0.0.0.0')
    df['merchant_id'] = df['merchant_id'].fillna('UNKNOWN')

    # 2. Normalize Transaction Amount
    scaler = MinMaxScaler()
    df['amount_normalized'] = scaler.fit_transform(df[['amount']])

    # 3. Encode Categorical Variables
    le_location = LabelEncoder()
    df['location_encoded'] = le_location.fit_transform(df['location'].astype(str))

    le_merchant = LabelEncoder()
    df['merchant_encoded'] = le_merchant.fit_transform(df['merchant_id'].astype(str))

    # 4. Create Derived Features

    # Transaction Velocity: number of transactions per account in last time window
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(['account_id', 'timestamp'])
    df['transaction_velocity'] = df.groupby('account_id')['transaction_id'].transform('count')
    # Normalize velocity per account
    max_velocity = df['transaction_velocity'].max()
    df['transaction_velocity'] = df['transaction_velocity'] / max_velocity if max_velocity > 0 else 0

    # Device Change Rate: unique devices per account / total transactions
    device_counts = df.groupby('account_id')['device_id'].nunique().reset_index()
    device_counts.columns = ['account_id', 'unique_devices']
    txn_counts = df.groupby('account_id')['transaction_id'].count().reset_index()
    txn_counts.columns = ['account_id', 'total_txns']
    device_rates = device_counts.merge(txn_counts, on='account_id')
    device_rates['device_change_rate'] = device_rates['unique_devices'] / device_rates['total_txns']
    df = df.merge(device_rates[['account_id', 'device_change_rate']], on='account_id', how='left')

    # IP Risk Score: based on IP pattern analysis
    def compute_ip_risk(ip: str) -> float:
        """Heuristic IP risk scoring."""
        if ip.startswith('10.') or ip.startswith('192.168.'):
            return np.random.uniform(5, 25)  # Internal IPs = low risk
        elif ip.startswith('172.'):
            return np.random.uniform(10, 40)
        else:
            return np.random.uniform(30, 90)  # External IPs = higher risk

    df['ip_risk_score'] = df['ip_address'].apply(compute_ip_risk)

    # Hour of day feature (transactions at unusual hours are riskier)
    df['hour_of_day'] = df['timestamp'].dt.hour
    df['is_night'] = ((df['hour_of_day'] >= 0) & (df['hour_of_day'] <= 5)).astype(int)

    # Amount deviation from account mean
    account_means = df.groupby('account_id')['amount'].transform('mean')
    account_stds = df.groupby('account_id')['amount'].transform('std').fillna(1)
    df['amount_z_score'] = (df['amount'] - account_means) / account_stds

    print(f"✅ Preprocessing complete. {len(df.columns)} features available.")
    return df


if __name__ == "__main__":
    df = clean_and_preprocess()
    print(f"\nFeatures: {list(df.columns)}")
    print(f"\nSample:\n{df.head()}")
