# Cyber Fraud Protector - Chrome Extension Implementation

## Overview
Successfully implemented the Chrome extension for the Cyber Fraud Intelligence Platform to detect and block phishing URLs in real-time.

## New Components Created
The extension is located in the `extension/` directory with the following components:

- **Manifest ([manifest.json](file:///c:/Users/Kiriti/Desktop/Mini_Project/extension/manifest.json))**: Configured as a Manifest V3 extension, requesting necessary permissions (`tabs`, `activeTab`) and granting access to `http://localhost:8000/*` for background communication.
- **Background Script ([background.js](file:///c:/Users/Kiriti/Desktop/Mini_Project/extension/background.js))**: Listens to URL updates using `chrome.tabs.onUpdated`. When a URL changes, it posts the URL to the FastAPI backend model (`/phishing/check`). If the model indicates a high risk (score >= 50 or level is "High" / "Critical"), it sends a message to the active tab to trigger the visual warning.
- **Content Script & Styles ([content.js](file:///c:/Users/Kiriti/Desktop/Mini_Project/extension/content.js), [content.css](file:///c:/Users/Kiriti/Desktop/Mini_Project/extension/content.css))**: Listens for the "SHOW_PHISHING_WARNING" message. When triggered, it injects a highly visible, styled overlay over the entire webpage warning the user. The overlay blocks interactions with the site underneath and provides options to safely go back or proceed at the user's own risk.

## Backend Changes Made
Modified [backend/app.py](file:///c:/Users/Kiriti/Desktop/Mini_Project/backend/app.py) CORS setup:
```diff
-    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
-    allow_credentials=True,
+    allow_origins=["*"],
+    allow_credentials=False,
```
This change enables requests originating from Chrome extensions (whose `Origin` header looks like `chrome-extension://<id>`) to connect and query the `/phishing/check` endpoint without encountering CORS blockages.

## How to Test
1. Make sure your FastAPI backend API is running (`cd backend && uvicorn app:app --reload`).
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked** and select the `c:\\Users\\Kiriti\\Desktop\\Mini_Project\\extension` folder.
5. Once loaded, open a new tab and try browsing to a URL. 
   - Note: The detection model will flag URLs based on its training, but you can force a high score response by using a well-known simulated phishing URL or adjusting the `background.js` to always show the warning for testing purposes.
