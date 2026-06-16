"""
new_demo.py — one command to start a FRESH demo.

Creates a clean Band room, adds the 4 agents, writes the room id to room.txt
(so console.py and the backend pick it up automatically), prints the link, and
optionally sends the opening request.

Why fresh: agents read room history; in a reused room they see "already done"
and skip. A clean room gives a clean Proposer -> Risk -> Master flow every time.

Usage:
    python new_demo.py                 # just create + add agents + print link
    python new_demo.py --trigger       # also send the default cleanup request
    python new_demo.py --trigger "deploy v2 to production right now"
"""

import sys
import time

import httpx
import yaml

CONFIG = "D:/NexusCore/agents/agent_config.yaml"
ROOM_FILE = "D:/NexusCore/agents/room.txt"
BASE = "https://app.band.ai/api/v1"
DEFAULT_REQUEST = ("implement user cleanup: remove old inactive accounts, "
                   "which requires DROP TABLE users.")


def main() -> None:
    cfg = yaml.safe_load(open(CONFIG))
    key = cfg["master_agent"]["api_key"]
    ids = {k: cfg[k]["agent_id"] for k in cfg}
    H = {"X-API-Key": key, "Content-Type": "application/json"}

    # 1. create a fresh room (creator = master agent)
    room = httpx.post(f"{BASE}/agent/chats", headers=H,
                      json={"chat": {}}, timeout=20).json()["data"]["id"]

    # 2. add the other three agents (master is already a participant)
    for name in ("risk_agent", "compliance_agent", "proposer_agent"):
        httpx.post(f"{BASE}/agent/chats/{room}/participants", headers=H,
                   json={"participant": {"participant_id": ids[name]}}, timeout=20)

    # 3. persist room id so console.py + backend use it automatically
    open(ROOM_FILE, "w").write(room)

    print(f"NEW DEMO ROOM: {room}")
    print(f"Link: https://app.band.ai/chat/{room}")

    # 4. optional opening request (give agents a few seconds to join first)
    if "--trigger" in sys.argv:
        extra = [a for a in sys.argv[1:] if a != "--trigger"]
        text = extra[0] if extra else DEFAULT_REQUEST
        print("Agents joining... sending request in 8s")
        time.sleep(8)
        body = {"message": {"content": f"@Proposer Agent {text}",
                            "mentions": [{"id": ids["proposer_agent"]}]}}
        r = httpx.post(f"{BASE}/agent/chats/{room}/messages",
                       headers=H, json=body, timeout=30)
        print("Request sent." if r.status_code == 201 else f"Send failed: {r.text[:120]}")


if __name__ == "__main__":
    main()
