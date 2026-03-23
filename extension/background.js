chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check when URL is updated
    if (changeInfo.url) {
        checkUrl(tabId, changeInfo.url);
    }
});

function checkUrl(tabId, url) {
    if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('edge://')) {
        return;
    }
    
    console.log("Checking phishing risk for URL: ", url);

    fetch('http://localhost:8000/phishing/check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log("Phishing check response:", data);
        if (data && (data.phishing_score >= 50 || data.risk_level === "High" || data.risk_level === "Critical")) {
            // Send message to content script to show warning
            chrome.tabs.sendMessage(tabId, {
                action: "SHOW_PHISHING_WARNING",
                data: data
            });
        }
    })
    .catch(err => console.error("Phishing check failed:", err));
}
