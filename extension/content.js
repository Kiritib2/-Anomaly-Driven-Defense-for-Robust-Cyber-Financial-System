chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "SHOW_PHISHING_WARNING") {
        showWarning(request.data);
    }
});

function showWarning(data) {
    if (document.getElementById('phish-protector-warning-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'phish-protector-warning-overlay';
    
    // Add shadow root for isolation if we wanted, but for simplicity, we use high z-index and specific IDs
    overlay.innerHTML = `
        <div class="phish-warning-card">
            <div class="phish-icon">⚠️</div>
            <h1 class="phish-title">Dangerous Website Blocked</h1>
            <p class="phish-desc">This website has been flagged as a potential phishing threat by the Cyber Fraud Intelligence Platform.</p>
            <div class="phish-stats">
                <div class="phish-stat">
                    <span>Risk Score</span>
                    <strong>${data.phishing_score.toFixed(1)}%</strong>
                </div>
                <div class="phish-stat">
                    <span>Risk Level</span>
                    <strong style="color: #ff4444;">${data.risk_level}</strong>
                </div>
            </div>
            <div class="phish-actions">
                <button id="phish-btn-back" class="phish-btn phish-btn-primary">Go Back Safely</button>
                <button id="phish-btn-proceed" class="phish-btn phish-btn-secondary">Proceed Anyway (Unsafe)</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('phish-btn-back').addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "https://www.google.com";
        }
        
        setTimeout(() => {
            if (document.getElementById('phish-protector-warning-overlay')) {
                window.location.href = "https://www.google.com";
            }
        }, 500);
    });

    document.getElementById('phish-btn-proceed').addEventListener('click', () => {
        overlay.remove();
    });
}
