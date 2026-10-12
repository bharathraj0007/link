# Consent Link Tracker

Local Python/FastAPI demo for explicit, user-controlled location sharing. It is not a covert tracker.

## Features
- Generate a random recipient link that expires after one hour.
- Recipient must press **Start sharing my location** and approve browser geolocation.
- Owner dashboard displays coordinates, estimated accuracy, timestamps, and map.
- Recipient can stop sharing; owner can revoke the link and clear the current location.
- Sessions and location data exist in server memory only; server restart clears them.

## Requirements
Python 3.10+, modern browser, internet for Leaflet map assets and map tiles.

## Windows setup
Open PowerShell in this folder:

    py -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install -r requirements.txt
    python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

Open http://127.0.0.1:8000. If PowerShell blocks activation, use Command Prompt and run .venv\Scripts\activate.bat instead.

## macOS / Linux setup

    python3 -m venv .venv
    source .venv/bin/activate
    python -m pip install -r requirements.txt
    python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

## Test
1. Open the dashboard and click **Create sharing link**.
2. Copy the link into another tab on the same computer.
3. On the recipient page, click **Start sharing my location** and grant browser location access.
4. Return to the dashboard to see updates. Click **Stop sharing** to stop sending updates.
5. Click **Revoke link and clear location** to invalidate the session.

Browser geolocation generally requires HTTPS except on loopback addresses such as 127.0.0.1. For phone testing, use a temporary, trusted HTTPS development tunnel; the phone cannot use the computer's 127.0.0.1 address.

## API
- POST /api/sessions — create a session.
- GET /api/sessions/{session_id}/location — owner-only location/status; requires X-Owner-Key.
- POST /api/sessions/{session_id}/revoke — revoke; requires X-Owner-Key.
- POST /api/share/{token}/start — record recipient's start action.
- POST /api/share/{token}/location — receive coordinates only while sharing.
- POST /api/share/{token}/stop — stop updates.
- GET /health — health check.

## Limitations
This is a local MVP, not production-ready. No accounts, persistent database, rate limiting, audit log, or multi-user administration. A share link is a bearer credential. Before real deployment, add HTTPS, authentication, abuse protection, and obtain consent. Do not use this to collect location secretly.
