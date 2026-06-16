# NexusCore

**The governance brain that sits above your AI agents.**
Agents don't execute dangerous actions directly — they *propose*, the action is
**HELD**, the agents discuss in the Band room, and only an ALLOW/BLOCK decision
lets it through. Everything is logged = audit trail.

> "Amazon's agent had no brain above it. NexusCore is that brain."

## What's in here

```
NexusCore/
├── backend/      FastAPI — governance API + live WebSocket feed (the demo runs here)
├── frontend/     HTML/CSS/JS dashboard — feature input, live Band feed, ALLOW/BLOCK
└── agents/       Band remote agents (Master/Risk/...) — real multi-agent collaboration
```

## Run the demo (backend + frontend, one command)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (use: source .venv/bin/activate on mac/linux)
pip install -r requirements.txt
python main.py
```

Open <http://localhost:8000>.

1. Type a feature → "Plan it" (Phase 1 input)
2. Watch the Band room feed update live
3. Click **Simulate dangerous action** → it appears HELD in the Emergency Brake
4. Click **ALLOW** or **BLOCK** → Master decision is logged

## The 3 keys (don't mix them up)

| Key | From | Role |
|-----|------|------|
| **Band API key** | band.ai -> Agents -> New Agent / Remote Agent | puts an agent in the room (talk + listen) |
| **LLM key** | AI/ML API ($10) or Featherless ($25) | 🧠 the agent's brain |
| **BANDHACK26** | promo at checkout | upgrades the Band *account* to Pro (not a code key) |

## Cross-framework (the originality angle)

Different agents, different brains, same room:

| Agent | Brain | Provider |
|-------|-------|----------|
| Master | GPT-4o | AI/ML API |
| Proposer | GPT-4o | AI/ML API |
| Compliance | GPT-4o-mini | AI/ML API |
| Risk | Qwen2.5-72B | Featherless |

All agents connect through Band's `LangGraphAdapter` (Python). Cross-provider /
cross-model: AI/ML (GPT family) + Featherless (Qwen).

## Status

- [x] Backend governance API + emergency brake + live feed
- [x] Frontend dashboard
- [x] Agent scaffolds using current Band SDK imports (`band`, `band.adapters.langgraph`)
- [x] Live Band room trigger + dashboard mirror
- [ ] Demo video + screenshots

Deadline: **Jun 19, 10:00 PM WIT**.
