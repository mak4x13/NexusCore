"""
NexusCore Console — inject a request into the Band room from the command line.

Posts a message (with @mentions) into the room so the running agents react.
Proves NexusCore can be driven programmatically, not only by typing in the UI.

Usage:
    python console.py "implement user cleanup, we may need to DROP the users table"
    python console.py --mention engineer,proposer,risk "deploy v2 to production now"

Verified Band REST schema:
    POST /api/v1/agent/chats/{room}/messages
    headers: X-API-Key: <agent api key>
    body: {"message": {"content": "...", "mentions": [{"id": "<agent-uuid>"}]}}
"""

import argparse
import sys

import httpx
import yaml

CONFIG = "D:/NexusCore/agents/agent_config.yaml"
BASE = "https://app.band.ai/api/v1"


def _room() -> str:
    """Read the current demo room (written by new_demo.py); fallback constant."""
    try:
        return open("D:/NexusCore/agents/room.txt").read().strip()
    except OSError:
        return "f0d6530c-e559-4172-b9eb-c19e818f7724"


ROOM = _room()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("text", help="message to post into the room")
    p.add_argument("--mention", default="proposer",
                   help=("comma list: engineer,proposer,risk,compliance,security,"
                         "test,infrastructure,rollback_audit,master"))
    p.add_argument("--as", dest="sender", default="proposer_agent",
                   help="which agent's key to send as")
    args = p.parse_args()

    cfg = yaml.safe_load(open(CONFIG))
    if args.sender not in cfg or not isinstance(cfg.get(args.sender), dict):
        print(f"Unknown sender: {args.sender}", file=sys.stderr)
        sys.exit(1)
    key = cfg[args.sender]["api_key"]

    name_map = {
        "engineer": "engineer_agent", "builder": "engineer_agent",
        "master": "master_agent", "risk": "risk_agent",
        "compliance": "compliance_agent", "proposer": "proposer_agent",
        "security": "security_agent", "test": "test_agent",
        "infrastructure": "infrastructure_agent", "infra": "infrastructure_agent",
        "rollback_audit": "rollback_audit_agent", "rollback": "rollback_audit_agent",
        "audit": "rollback_audit_agent",
    }
    mentions = []
    for raw in args.mention.split(","):
        key_name = raw.strip()
        agent_name = name_map.get(key_name)
        entry = cfg.get(agent_name) if agent_name else None
        if isinstance(entry, dict) and entry.get("agent_id"):
            mentions.append({"id": entry["agent_id"]})

    body = {"message": {"content": args.text, "mentions": mentions}}
    r = httpx.post(f"{BASE}/agent/chats/{ROOM}/messages",
                   headers={"X-API-Key": key, "Content-Type": "application/json"},
                   json=body, timeout=30)
    if r.status_code == 201:
        print(f"Sent. Mentioned: {args.mention}. Watch the Band room for replies.")
    else:
        print(f"Failed ({r.status_code}): {r.text[:200]}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
