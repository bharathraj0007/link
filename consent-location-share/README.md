# Consent Location Share

Consent-first location-sharing MVP. The recipient must press Start sharing and grant browser geolocation permission. They can stop sharing at any time; the link owner can revoke the session and clear stored coordinates.

## Linux / macOS
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
Open http://127.0.0.1:8000.

## Windows
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

## Usage
1. Choose Create sharing link on the dashboard.
2. Send the generated link to the intended recipient.
3. The recipient must choose Start sharing and grant location permission in their browser.
4. The dashboard shows the latest coordinates while sharing is active.
5. The recipient can stop, or the owner can revoke the session to clear location data.

Browser geolocation generally requires HTTPS outside localhost. Session data is stored in memory and resets when the app restarts. This is a local MVP, not production-ready; add authentication, abuse protection, audit logging, and hardened HTTPS deployment before real use. It does not support covert tracking.
