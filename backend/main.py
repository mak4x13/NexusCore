"""
NexusCore — Backend (FastAPI)
The governance brain that sits above AI agents.

Core idea (the "emergency brake"):
  An agent does NOT execute a dangerous action directly. It PROPOSES the action,
  the action is HELD, the agents discuss it in the Band room, and only a final
  ALLOW / BLOCK decision lets it through. Everything is logged = audit trail.

This backend exposes:
  - feature requests (Phase 1 input)
  - a room message feed (the audit trail / shared memory mirror)
  - dangerous-action proposals that get HELD until a decision
  - a WebSocket that pushes every new event to the dashboard live
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import (Depends, FastAPI, Header, HTTPException, WebSocket,
                     WebSocketDisconnect)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="NexusCore", version="0.1.0")

# Allow the static frontend (and local dev) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional demo auth for public deployment. If DEMO_TOKEN is set, write endpoints
# require header X-Demo-Token. If unset, local hackathon behavior is unchanged.
DEMO_TOKEN = os.environ.get("DEMO_TOKEN")


def require_demo_token(x_demo_token: Optional[str] = Header(default=None)) -> None:
    if DEMO_TOKEN and x_demo_token != DEMO_TOKEN:
        raise HTTPException(401, "missing or invalid X-Demo-Token")


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class ActionStatus(str, Enum):
    HELD = "HELD"        # proposed, waiting for the brain's decision
    ALLOWED = "ALLOWED"  # Master approved -> safe to execute
    BLOCKED = "BLOCKED"  # Master refused -> never executed


class FeatureRequest(BaseModel):
    text: str


class Feature(BaseModel):
    id: str
    text: str
    created_at: str


class Message(BaseModel):
    """One line in the Band room = one entry in the audit trail."""
    id: str
    feature_id: Optional[str] = None
    author: str          # e.g. "Master Agent", "Risk Agent", "Engineer"
    role: str            # master | risk | compliance | proposer | human
    content: str
    created_at: str


class ProposeAction(BaseModel):
    feature_id: Optional[str] = None
    agent: str           # who wants to do the dangerous thing
    action: str          # e.g. "DROP DATABASE users"
    risk: str            # why it is dangerous


class Action(BaseModel):
    id: str
    feature_id: Optional[str]
    agent: str
    action: str
    risk: str
    status: ActionStatus
    decided_by: Optional[str] = None
    reason: Optional[str] = None
    created_at: str
    decided_at: Optional[str] = None


class Decision(BaseModel):
    allow: bool
    decided_by: str = "Master Agent"
    reason: str = ""


# --------------------------------------------------------------------------- #
# In-memory store (swap for a DB later; fine for the hackathon demo)
# --------------------------------------------------------------------------- #
FEATURES: List[Feature] = []
MESSAGES: List[Message] = []
ACTIONS: List[Action] = []


# --------------------------------------------------------------------------- #
# Live feed via WebSocket
# --------------------------------------------------------------------------- #
class Hub:
    def __init__(self) -> None:
        self.clients: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.clients:
            self.clients.remove(ws)

    async def broadcast(self, kind: str, data: dict) -> None:
        dead = []
        for ws in self.clients:
            try:
                await ws.send_json({"kind": kind, "data": data})
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


hub = Hub()


async def _post(author: str, role: str, content: str,
                feature_id: Optional[str] = None) -> Message:
    msg = Message(
        id=_id("msg"), feature_id=feature_id, author=author,
        role=role, content=content, created_at=_now(),
    )
    MESSAGES.append(msg)
    await hub.broadcast("message", msg.model_dump())
    return msg


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #
@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "service": "NexusCore", "time": _now()}


@app.post("/api/features", response_model=Feature)
async def create_feature(req: FeatureRequest) -> Feature:
    feature = Feature(id=_id("feat"), text=req.text, created_at=_now())
    FEATURES.append(feature)
    await _post("Engineer", "human", f"Feature request: {req.text}", feature.id)
    await _post("Master Agent", "master",
                "Received request. Checking Band memory, then dispatching agents.",
                feature.id)
    return feature


@app.get("/api/features", response_model=List[Feature])
async def list_features() -> List[Feature]:
    return FEATURES


@app.get("/api/messages", response_model=List[Message])
async def list_messages() -> List[Message]:
    return MESSAGES


@app.post("/api/messages", response_model=Message,
          dependencies=[Depends(require_demo_token)])
async def add_message(msg: Message) -> Message:
    """Agents post their collaboration here (mirrors a Band room message)."""
    return await _post(msg.author, msg.role, msg.content, msg.feature_id)


@app.post("/api/actions/propose", response_model=Action,
          dependencies=[Depends(require_demo_token)])
async def propose_action(p: ProposeAction) -> Action:
    """An agent wants to do something dangerous. HOLD it. Do NOT execute."""
    action = Action(
        id=_id("act"), feature_id=p.feature_id, agent=p.agent,
        action=p.action, risk=p.risk, status=ActionStatus.HELD,
        created_at=_now(),
    )
    ACTIONS.append(action)
    await _post(p.agent, "proposer",
                f"REQUESTING DANGEROUS ACTION: {p.action}", p.feature_id)
    await _post("Risk Agent", "risk",
                f"HELD. Risk: {p.risk}. Awaiting Master decision.", p.feature_id)
    await hub.broadcast("action", action.model_dump())
    return action


@app.get("/api/actions", response_model=List[Action])
async def list_actions() -> List[Action]:
    return ACTIONS


@app.post("/api/actions/{action_id}/decide", response_model=Action,
          dependencies=[Depends(require_demo_token)])
async def decide_action(action_id: str, d: Decision) -> Action:
    action = next((a for a in ACTIONS if a.id == action_id), None)
    if action is None:
        raise HTTPException(404, "action not found")
    if action.status != ActionStatus.HELD:
        raise HTTPException(409, f"already {action.status}")

    action.status = ActionStatus.ALLOWED if d.allow else ActionStatus.BLOCKED
    action.decided_by = d.decided_by
    action.reason = d.reason
    action.decided_at = _now()

    verdict = "ALLOW" if d.allow else "BLOCK"
    await _post(d.decided_by, "master",
                f"DECISION: {verdict} on '{action.action}'. {d.reason}".strip(),
                action.feature_id)
    await hub.broadcast("action", action.model_dump())
    return action


# --------------------------------------------------------------------------- #
# Live Band bridge — post a request straight into the real Band room so the
# running remote agents (Master/Risk/Compliance/Proposer) react. Verified schema.
# --------------------------------------------------------------------------- #
import re  # noqa: E402

import httpx  # noqa: E402
import yaml  # noqa: E402

_AGENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "agents")
BAND_BASE = "https://app.band.ai/api/v1"
_ROOM_FALLBACK = "f0d6530c-e559-4172-b9eb-c19e818f7724"
_NAME_MAP = {"master": "master_agent", "risk": "risk_agent",
             "compliance": "compliance_agent", "proposer": "proposer_agent"}
_REQUIRED_AGENTS = ["master_agent", "risk_agent",
                    "compliance_agent", "proposer_agent"]


def _current_room() -> str:
    """Single source of truth: BAND_ROOM env if set, else agents/room.txt."""
    env = os.environ.get("BAND_ROOM")
    if env and env.strip():
        return env.strip()
    try:
        return open(os.path.join(_AGENTS_DIR, "room.txt")).read().strip()
    except OSError:
        return _ROOM_FALLBACK


def _load_band_cfg() -> dict:
    """Load agent_config.yaml. Raise a clear 503 if missing/invalid.

    Never includes secret values in the error message.
    """
    path = os.path.join(_AGENTS_DIR, "agent_config.yaml")
    try:
        with open(path) as f:
            cfg = yaml.safe_load(f)
    except FileNotFoundError:
        raise HTTPException(503, "Band not configured: agents/agent_config.yaml missing")
    except yaml.YAMLError:
        raise HTTPException(503, "Band not configured: agent_config.yaml is invalid YAML")
    if not isinstance(cfg, dict) or not cfg:
        raise HTTPException(503, "Band not configured: agent_config.yaml is empty")
    return cfg


def _id_name_map() -> dict:
    cfg = _load_band_cfg()
    return {cfg[k]["agent_id"]: k.replace("_agent", "").title() + " Agent"
            for k in cfg if isinstance(cfg.get(k), dict) and "agent_id" in cfg[k]}


def _role_of(name: str) -> str:
    n = (name or "").lower()
    for role in ("master", "risk", "compliance", "proposer"):
        if role in n:
            return role
    return "human"


class BandTrigger(BaseModel):
    text: str
    mention: List[str] = ["proposer", "risk", "compliance"]
    sender: str = "master_agent"   # Master dispatches the work


@app.get("/api/band/status")
async def band_status() -> dict:
    """Config health for the dashboard. Never returns API key values."""
    room = _current_room()
    try:
        cfg = _load_band_cfg()
    except HTTPException as e:
        return {"configured": False, "room": room, "agents": [],
                "missing": _REQUIRED_AGENTS, "detail": e.detail}
    present = [a for a in _REQUIRED_AGENTS
              if isinstance(cfg.get(a), dict)
              and cfg[a].get("agent_id") and cfg[a].get("api_key")]
    missing = [a for a in _REQUIRED_AGENTS if a not in present]
    return {"configured": not missing, "room": room,
            "agents": present, "missing": missing}


@app.post("/api/band/trigger", dependencies=[Depends(require_demo_token)])
async def band_trigger(t: BandTrigger) -> dict:
    """Inject a request into the live Band room; agents respond there."""
    cfg = _load_band_cfg()
    if t.sender not in cfg or not isinstance(cfg.get(t.sender), dict):
        raise HTTPException(400, f"unknown sender: {t.sender}")
    key = cfg[t.sender].get("api_key")
    if not key:
        raise HTTPException(503, f"sender {t.sender} has no Band api_key configured")

    unknown = [m for m in t.mention if m not in _NAME_MAP]
    if unknown:
        raise HTTPException(400, f"unknown mention(s): {', '.join(unknown)}")
    # cannot @mention yourself — drop the sender from the mention list
    mentions = [{"id": cfg[_NAME_MAP[m]]["agent_id"]}
                for m in t.mention
                if _NAME_MAP[m] != t.sender and isinstance(cfg.get(_NAME_MAP[m]), dict)
                and cfg[_NAME_MAP[m]].get("agent_id")]
    if not mentions:
        raise HTTPException(400, "no valid agents to mention")

    body = {"message": {"content": t.text, "mentions": mentions}}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{BAND_BASE}/agent/chats/{_current_room()}/messages",
            headers={"X-API-Key": key, "Content-Type": "application/json"},
            json=body,
        )
    if r.status_code != 201:
        raise HTTPException(502, f"Band rejected the message ({r.status_code})")
    # mirror into the local feed so the dashboard shows what was triggered
    await _post("Engineer", "human", f"→ Band room: {t.text}")
    return {"sent": True, "mentioned": t.mention}


@app.get("/api/band/room")
async def band_room() -> dict:
    """Current live Band room id + link, so the dashboard shows where to watch."""
    room = _current_room()
    return {"room": room, "link": f"https://app.band.ai/chat/{room}"}


@app.get("/api/band/messages")
async def band_messages() -> List[dict]:
    """Read the real Band room history — the live audit trail.

    The agent REST API returns only messages relevant to the calling agent, so we
    aggregate every agent's view and dedup by id to reconstruct the full transcript.
    """
    cfg = _load_band_cfg()
    idmap = _id_name_map()
    by_id: dict = {}
    room = _current_room()
    async with httpx.AsyncClient(timeout=20) as client:
        for name in cfg:
            entry = cfg.get(name)
            if not isinstance(entry, dict) or not entry.get("api_key"):
                continue
            try:
                r = await client.get(
                    f"{BAND_BASE}/agent/chats/{room}/messages?status=all&page_size=100",
                    headers={"X-API-Key": entry["api_key"]},
                )
            except httpx.HTTPError:
                continue
            if r.status_code != 200:
                continue
            for m in r.json().get("data", []):
                by_id[m["id"]] = m
    out = []
    for m in by_id.values():
        content = m.get("content", "") or ""
        content = re.sub(r"@\[\[([0-9a-fA-F-]+)\]\]",
                         lambda mo: "@" + idmap.get(mo.group(1), "agent"), content)
        out.append({
            "id": m.get("id"),
            "author": m.get("sender_name", "?"),
            "role": _role_of(m.get("sender_name", "")),
            "content": content,
            "created_at": m.get("inserted_at"),
        })
    out.sort(key=lambda x: x["created_at"] or "")
    return out


@app.websocket("/ws")
async def ws(ws: WebSocket) -> None:
    await hub.connect(ws)
    # send a snapshot so a fresh dashboard is not empty
    await ws.send_json({"kind": "snapshot", "data": {
        "messages": [m.model_dump() for m in MESSAGES],
        "actions": [a.model_dump() for a in ACTIONS],
    }})
    try:
        while True:
            await ws.receive_text()  # keepalive; we only push
    except WebSocketDisconnect:
        hub.disconnect(ws)


# Serve the frontend (so one `uvicorn` command runs the whole demo).
# Mounted last so it does not shadow /api routes.
_FRONTEND = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(_FRONTEND):
    app.mount("/", StaticFiles(directory=_FRONTEND, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
