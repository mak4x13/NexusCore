# NexusCore — Frontend Review Handoff

Status: **ready for review**. Backend audited, all endpoints verified, frontend
wired to the live backend. Nothing secret is committed.

## How to run it (to review locally)

```bash
# 1. Agents — one terminal each (Python 3.11+, uv). They connect to Band.
cd agents
uv venv --python 3.12 .venv && uv pip install -r requirements.txt
python master_agent.py        # + risk_agent.py, compliance_agent.py, proposer_agent.py

# 2. Backend + dashboard (serves the frontend on the same origin)
cd backend
python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt
python main.py                # http://localhost:8000
```

Open <http://localhost:8000>. Type a request → **▶ Run on Band** → the 4 agents
collaborate and the result streams into the audit feed.

> Demo tip: each demo should use a fresh room — run `python agents/new_demo.py`
> (writes `agents/room.txt`, which the backend reads automatically).

## Frontend files to review

| File | What it is |
|------|------------|
| `frontend/index.html` | Layout: request bar, live Band audit feed, Emergency Brake panel |
| `frontend/app.js` | All logic: trigger, live audit polling, websocket, demo-token handling |
| `frontend/style.css` | Dark theme, role-colored messages, responsive |

## Two flows on the dashboard (intentional — please keep distinct)

1. **Run on Band (primary, real):** `▶ Run on Band` → `POST /api/band/trigger`.
   Real agents respond; the feed mirrors the real Band room via `GET /api/band/messages`
   (polled every 3s). Header shows the live room link (`GET /api/band/room`).
2. **Emergency Brake (local concept demo):** `Simulate dangerous action` + ALLOW/BLOCK.
   Self-contained, no Band — illustrates the gate concept. Labeled as such in the UI.

## Backend API the frontend uses

| Endpoint | Use |
|----------|-----|
| `POST /api/band/trigger` | Send request to live Band room (mentions proposer, risk, compliance) |
| `GET /api/band/messages` | Full audit transcript (aggregated across agents, mentions resolved to names) |
| `GET /api/band/room` | Current room id + link |
| `GET /api/band/status` | Config health: configured?, room, agents, missing (no secrets) |
| `POST /api/actions/propose` `…/decide` | Local Emergency Brake simulation |
| `WS /ws` | Live push for the local simulation feed |

## Demo auth (only if deployed publicly)

If `DEMO_TOKEN` is set on the backend, write endpoints need header `X-Demo-Token`.
The frontend already handles this: on `401` it prompts once and stores the token in
`localStorage`. Locally `DEMO_TOKEN` is unset, so nothing is required.

## Review focus suggestions

- UX clarity: is the "real vs concept demo" split obvious enough?
- Feed readability when both real Band messages and local sim mix (after a room switch
  the feed isn't cleared until refresh — candidate small fix).
- Mobile/responsive layout (`@media max-width:780px`).
- Accessibility: button labels, color contrast on role colors.

## Verified before handoff

- `py_compile` backend + agents: pass
- FastAPI TestClient: health, features, propose(HELD), decide(BLOCKED), band/status(configured): pass
- DEMO_TOKEN: 401 without / 200 with: pass
- Live 4-agent chain incl. Compliance: Proposer → Risk → Compliance → Master DECISION: pass
- Frontend element ids consistent with app.js: pass

## Known limitations (honest)

- Brand-new Band rooms occasionally need a Master restart (Band resync quirk).
- Audit is aggregated per-agent view (Band agent API has no single full-transcript read).
- Feed not auto-cleared on room switch (refresh to reset).
- Not done yet: demo video + screenshots, GitHub push.
