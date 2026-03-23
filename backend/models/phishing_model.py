"""
Phishing URL Detection Model
Uses RandomForestClassifier trained on URL structural features.
"""
import re
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import os

_model = None
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "phishing_model.pkl")


def _extract_url_features(url: str) -> list:
    """Extract structural features from a URL string."""
    features = []
    # 1. URL length
    features.append(len(url))
    # 2. Number of dots
    features.append(url.count('.'))
    # 3. Number of hyphens
    features.append(url.count('-'))
    # 4. Number of underscores
    features.append(url.count('_'))
    # 5. Number of slashes
    features.append(url.count('/'))
    # 6. Number of question marks
    features.append(url.count('?'))
    # 7. Number of equals signs
    features.append(url.count('='))
    # 8. Number of @ symbols (suspicious)
    features.append(url.count('@'))
    # 9. Has IP address pattern
    ip_pattern = re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}')
    features.append(1 if ip_pattern.search(url) else 0)
    # 10. Uses HTTPS
    features.append(1 if url.startswith('https') else 0)
    # 11. Number of suspicious keywords
    suspicious_keywords = ['login', 'secure', 'account', 'update', 'verify',
                           'bank', 'confirm', 'password', 'signin', 'auth',
                           'credential', 'suspend', 'alert', 'unusual']
    keyword_count = sum(1 for kw in suspicious_keywords if kw in url.lower())
    features.append(keyword_count)
    # 12. Number of digits
    features.append(sum(c.isdigit() for c in url))
    # 13. Number of special characters
    special = sum(1 for c in url if c in '!#$%^&*()+={}[]|\\:;"\'<>,')
    features.append(special)
    # 14. Subdomain count (number of dots before first slash after protocol)
    try:
        domain_part = url.split('//')[1].split('/')[0] if '//' in url else url.split('/')[0]
        features.append(domain_part.count('.'))
    except:
        features.append(0)
    # 15. Path length
    try:
        path = url.split('//')[1].split('/', 1)[1] if '//' in url and '/' in url.split('//')[1] else ''
        features.append(len(path))
    except:
        features.append(0)
    return features


def _generate_training_data(n_samples=5000):
    """Generate synthetic URL training data."""
    np.random.seed(42)
    X, y = [], []

    # Generate benign URLs
    benign_domains = ['google.com', 'github.com', 'stackoverflow.com', 'amazon.com',
                      'microsoft.com', 'apple.com', 'wikipedia.org', 'reddit.com',
                      'youtube.com', 'linkedin.com', 'twitter.com', 'facebook.com']
    benign_paths = ['', '/about', '/products', '/contact', '/help',
                    '/search?q=python', '/docs/api', '/blog/2024', '/home']

    for _ in range(n_samples // 2):
        domain = np.random.choice(benign_domains)
        path = np.random.choice(benign_paths)
        protocol = np.random.choice(['https://', 'http://'], p=[0.85, 0.15])
        url = f"{protocol}{domain}{path}"
        X.append(_extract_url_features(url))
        y.append(0)

    # Generate phishing URLs
    phishing_patterns = [
        'http://{ip}/login/secure-update/verify',
        'http://secure-{bank}-login.{tld}/account/verify?id={id}',
        'https://{bank}.account-update.{tld}/auth/confirm',
        'http://{ip}/credential-verify/password-reset',
        'http://login-{bank}-secure.{tld}/signin?token={id}',
        'http://{bank}-alert.{tld}/suspend/unusual-activity',
        'http://update-{bank}.{tld}/verify/account?session={id}',
    ]
    ips = ['192.168.1.1', '10.0.0.1', '172.16.0.1', '45.33.22.11']
    banks = ['paypal', 'chase', 'wellsfargo', 'bankofamerica', 'citibank']
    tlds = ['com.xyz', 'net.ru', 'org.cn', 'tk', 'ml', 'ga']

    for _ in range(n_samples // 2):
        pattern = np.random.choice(phishing_patterns)
        url = pattern.format(
            ip=np.random.choice(ips),
            bank=np.random.choice(banks),
            tld=np.random.choice(tlds),
            id=np.random.randint(10000, 99999)
        )
        X.append(_extract_url_features(url))
        y.append(1)

    return np.array(X), np.array(y)


def train():
    """Train the phishing model and save it."""
    global _model
    print("🔄 Training phishing detection model...")
    X, y = _generate_training_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    _model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=15)
    _model.fit(X_train, y_train)

    accuracy = _model.score(X_test, y_test)
    print(f"✅ Phishing model trained. Test accuracy: {accuracy:.4f}")

    joblib.dump(_model, _MODEL_PATH)
    return accuracy


def get_model():
    """Get the trained model, training if necessary."""
    global _model
    if _model is not None:
        return _model
    if os.path.exists(_MODEL_PATH):
        _model = joblib.load(_MODEL_PATH)
        print("✅ Loaded saved phishing model.")
        return _model
    train()
    return _model


def predict(url: str) -> dict:
    """Predict phishing probability for a given URL."""
    model = get_model()
    features = np.array([_extract_url_features(url)])
    proba = model.predict_proba(features)[0]
    phishing_score = round(float(proba[1]) * 100, 2)

    if phishing_score >= 75:
        risk_level = "critical"
    elif phishing_score >= 50:
        risk_level = "high"
    elif phishing_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "phishing_score": phishing_score,
        "risk_level": risk_level,
        "url": url,
        "features_extracted": len(features[0])
    }
