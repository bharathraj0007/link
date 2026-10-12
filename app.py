from __future__ import annotations
import secrets, time
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"
TTL = 3600
STALE = 300
app = FastAPI(title="Consent Link Tracker", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC), name="static")
sessions: dict[str, dict] = {}

def now() -> int:
    return int(time.time())

def owner_session(sid: str) -> dict:
    s = sessions.get(sid)
    if not s or s["expires_at"] <= now():
        sessions.pop(sid, None)
        raise HTTPException(404, "Session not found or expired")
    if s["revoked"]:
        raise HTTPException(410, "Sharing session has been revoked")
    return s

def check_owner(s: dict, key: Optional[str]) -> None:
    if not key or not secrets.compare_digest(s["owner_key"], key):
        raise HTTPException(401, "Invalid owner key")

def share_session(token: str) -> dict:
    for sid, s in list(sessions.items()):
        if s["expires_at"] <= now():
            sessions.pop(sid, None)
            continue
        if secrets.compare_digest(s["share_token"], token):
            if s["revoked"]:
                raise HTTPException(410, "Sharing session has been revoked")
            return s
    raise HTTPException(404, "Share link not found or expired")

@app.get("/")
def home():
    return FileResponse(STATIC / "index.html")

@app.get("/share/{share_token}")
def share_page(share_token: str):
    return FileResponse(STATIC / "share.html")

@app.post("/api/sessions")
def create_session():
    sid, key, token = secrets.token_urlsafe(12), secrets.token_urlsafe(32), secrets.token_urlsafe(24)
    sessions[sid] = {"owner_key": key, "share_token": token, "created_at": now(),
        "expires_at": now() + TTL, "revoked": False, "consent": False, "sharing": False, "location": None}
    return {"session_id": sid, "owner_key": key, "share_url": f"/share/{token}", "expires_at": sessions[sid]["expires_at"]}

class LocationPayload(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: Optional[float] = Field(default=None, ge=0, le=10_000_000)
    captured_at: Optional[int] = None

@app.post("/api/share/{share_token}/start")
def start_sharing(share_token: str):
    s = share_session(share_token)
    s["consent"], s["sharing"] = True, True
    return {"ok": True}

@app.post("/api/share/{share_token}/location")
def update_location(share_token: str, payload: LocationPayload):
    s = share_session(share_token)
    if not s["consent"] or not s["sharing"]:
        raise HTTPException(403, "Sharing has not been started by the user")
    s["location"] = {"latitude": payload.latitude, "longitude": payload.longitude,
        "accuracy": payload.accuracy, "captured_at": payload.captured_at or now(), "received_at": now()}
    return {"ok": True}

@app.post("/api/share/{share_token}/stop")
def stop_sharing(share_token: str):
    s = share_session(share_token)
    s["sharing"] = False
    return {"ok": True}

@app.get("/api/sessions/{session_id}/location")
def owner_location(session_id: str, x_owner_key: Optional[str] = Header(default=None)):
    s = owner_session(session_id)
    check_owner(s, x_owner_key)
    loc = s["location"]
    if loc and now() - loc["received_at"] > STALE:
        loc = None
    return {"consent": s["consent"], "sharing": s["sharing"], "location": loc, "expires_at": s["expires_at"]}

@app.post("/api/sessions/{session_id}/revoke")
def revoke_session(session_id: str, x_owner_key: Optional[str] = Header(default=None)):
    s = sessions.get(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    check_owner(s, x_owner_key)
    s.update(revoked=True, sharing=False, location=None)
    return {"ok": True, "message": "Session revoked and stored location cleared"}

@app.get("/health")
def health():
    return {"status": "ok"}
