# NexusCore Backend Audit

Date: 2026-06-16
Scope: backend API, Band bridge, agent integration, dashboard clarity, and demo readiness.

## Executive Summary

NexusCore has a strong hackathon concept and the backend is easy to understand for a small team: one FastAPI app, clear Pydantic models, a WebSocket live feed, and direct Band REST integration. The local governance API is working: feature creation, dangerous action hold, ALLOW/BLOCK decision, and audit feed passed smoke tests.

The biggest risks are not the core idea. The biggest risks are demo reliability and consistency:

- The live Band flow and the local Emergency Brake flow are still partly separate.
- The live demo now includes Compliance in the handoff path.
- `BAND_ROOM` is now used consistently by Band bridge endpoints.
- Public deployment now has optional `DEMO_TOKEN` auth for write endpoints.
- Submission/docs now match the current model/provider setup.

Current readiness:

- Backend local API: 8.5/10
- Band integration code path: 8/10
- Team readability: 8/10
- Judge-facing demo clarity: 8/10
- Public deployment safety: 7/10 with `DEMO_TOKEN` enabled

## What Works Well

- The backend story is clear: proposal -> HELD -> decision -> audit trail.
- Pydantic models are simple enough for the team to understand quickly.
- WebSocket snapshot + broadcast makes the dashboard feel live.
- `/api/actions/propose` correctly creates a HELD action and does not execute anything.
- `/api/actions/{action_id}/decide` blocks repeat decisions with a 409.
- The dashboard is simple and understandable for a hackathon demo.
- Band room mirroring is a good judging signal because it shows Band as the shared audit trail.
- Agents are short and readable, which helps the team explain them.

## Critical Findings

### 1. Public Band trigger now has optional demo authentication

Files:

- `backend/main.py:33-38`
- `backend/main.py:266-285`
- `backend/main.py:312-346`

The backend now supports `DEMO_TOKEN`. When set, write endpoints require `X-Demo-Token`, including `/api/band/trigger`, `/api/actions/propose`, `/api/actions/{id}/decide`, and `/api/messages`.

Why it matters:

- This is acceptable for hackathon demo.
- For production, CORS should still be restricted from `*` to the deployed frontend origin.

Status:

- Fixed for demo/public hackathon deployment when `DEMO_TOKEN` is set.

### 2. Compliance Agent is now in the default live demo path

Files:

- `frontend/app.js:84-88`
- `backend/main.py:260-263`
- `agents/proposer_agent.py:28-35`

The UI and backend now include `compliance` in the default live Band request path, and the Proposer prompt includes Compliance in the handoff.

Why it matters:

- The submission says 4 agents collaborate.
- The judging criteria rewards specialized roles, clear handoffs, review, and escalation.

Status:

- Fixed.

### 3. `BAND_ROOM` env is now used by Band endpoints

Files:

- `backend/main.py:250`
- `backend/main.py:277`
- `backend/main.py:308`
- `backend/main.py:322`

Band endpoints now use a single `_current_room()` helper. `BAND_ROOM` wins when set; otherwise the backend reads `agents/room.txt`.

Why it matters:

- Team members may update `.env` and still post to the wrong Band room.
- Demo can accidentally point to an old room.

Status:

- Fixed.

### 4. Band config failures become generic 500s

Files:

- `backend/main.py:255-257`
- `backend/main.py:269-273`
- `backend/main.py:319-328`

The backend assumes `agents/agent_config.yaml` exists and contains every expected agent. Missing file, bad YAML, invalid sender, or missing key can raise unhandled exceptions.

Why it matters:

- New team members will hit confusing 500 errors.
- During a live demo, one missing config file can break the dashboard.

Recommended fix:

- Validate config at startup or return clear HTTP errors:
  - 503 when Band config is missing.
  - 400 for invalid sender/mention.
  - 502 when Band API returns an unexpected response.
- Add a `/api/band/status` endpoint showing room configured, agents configured, and whether keys are present without exposing secret values.

## Medium Findings

### 5. Local Emergency Brake and live Band flow are not fully connected

Files:

- `frontend/app.js:65-90`
- `frontend/app.js:92-115`
- `frontend/app.js:146-161`
- `backend/main.py:160-227`
- `backend/main.py:266-346`

There are currently two flows:

- Local flow: Plan it -> Simulate dangerous action -> HELD -> manual ALLOW/BLOCK.
- Live Band flow: Live Band -> post message to Band -> poll Band messages.

Why it matters:

- The local Emergency Brake card does not automatically reflect the real Band agents' proposal.
- Judges may ask whether the Band agents are actually driving the HELD/ALLOW/BLOCK state.

Recommended fix:

- For hackathon speed, make one demo button that:
  - creates a local feature,
  - posts to Band,
  - creates a local HELD action,
  - mirrors Band messages into the feed.
- Longer term, parse Band messages for `PROPOSAL:` and `DECISION:` and update local action state automatically.

### 6. Submission/docs match current model/provider setup

Files:

- `README.md:48-51`
- `SUBMISSION.md:34-39`
- `SUBMISSION.md:62-64`
- `agents/master_agent.py:57-60`
- `agents/compliance_agent.py:39-42`
- `agents/proposer_agent.py:42-45`
- `agents/risk_agent.py:40-43`

Docs and code now align on the current setup:

- Master: `gpt-4o` via AI/ML API.
- Proposer: `gpt-4o` via AI/ML API.
- Compliance: `gpt-4o-mini` via AI/ML API.
- Risk: `Qwen/Qwen2.5-72B-Instruct` via Featherless.

Why it matters:

- Judges may compare repo code and submission text.
- The cross-framework originality claim should be truthful and easy to defend.

Status:

- Fixed.

### 7. No explicit API validation constraints

Files:

- `backend/main.py:58-101`

The API accepts unrestricted strings for feature text, action text, risk text, role, and author.

Why it matters:

- Fine for local demo.
- Public demo can get empty values, huge messages, or unknown roles.

Recommended fix:

- Add `Field(..., min_length=1, max_length=...)`.
- Use `Literal` or Enum for roles.
- Validate `mention` and `sender` values in `BandTrigger`.

### 8. In-memory state is demo-only and resets on reload

Files:

- `backend/main.py:104-109`
- `backend/main.py:376`

The API stores features/messages/actions in module-level lists. `uvicorn` runs with `reload=True`, so state can reset if files change.

Why it matters:

- Fine for a demo.
- Team should not present it as persistent enterprise storage.

Recommended fix:

- For hackathon: document this as demo memory.
- If needed: add SQLite later for persisted audit trail.

### 9. Secret hygiene is mostly OK, but manual submission can still leak keys

Files:

- `.gitignore:1-6`
- `agents/agent_config.yaml`
- `backend/.env`
- `agents/.env`

`.gitignore` excludes `.env` and `agent_config.yaml`, which is good. However, if the team uploads a zip manually instead of using git, real keys can still leak.

Recommended fix:

- Do not include `agents/agent_config.yaml`, `backend/.env`, or `agents/.env` in any upload.
- Rotate Band keys if they were ever shared publicly.
- Add a short `SUBMISSION_CLEANUP.md` or checklist before publishing.

## Low Findings

### 10. Minor style/readability issues

Files:

- `backend/main.py:19`
- `backend/main.py:234-236`
- `backend/main.py:366`

Issues:

- `asyncio` import appears unused.
- `os` is imported twice.
- File mixes core API, Band client, and static serving in one module.

Recommended fix:

- For hackathon, this is acceptable.
- If refactoring, split into:
  - `models.py`
  - `band_client.py`
  - `routes.py`
  - `main.py`

### 11. Frontend labels are understandable but could be clearer for judges

Files:

- `frontend/index.html:30-36`
- `frontend/index.html:40-52`

The dashboard is understandable, but "Plan it", "Live Band", and "Simulate dangerous action" create three separate mental models.

Recommended fix:

- Rename or combine for demo:
  - `Run Governance Demo`
  - `Send to Band`
  - `Hold Dangerous Action`
- Keep one obvious primary path for the video.

## API Inventory

Core governance API:

- `GET /api/health`
  - Health check.
- `POST /api/features`
  - Creates a feature request and posts initial local audit messages.
- `GET /api/features`
  - Lists in-memory feature requests.
- `GET /api/messages`
  - Lists local audit feed messages.
- `POST /api/messages`
  - Adds a local audit feed message.
- `POST /api/actions/propose`
  - Creates a HELD dangerous action.
- `GET /api/actions`
  - Lists dangerous actions.
- `POST /api/actions/{action_id}/decide`
  - Converts HELD action to ALLOWED or BLOCKED.
- `WebSocket /ws`
  - Sends snapshot and live message/action updates to the dashboard.

Band bridge:

- `POST /api/band/trigger`
  - Sends a message into the configured Band room using an agent API key.
- `GET /api/band/room`
  - Returns current Band room ID and link.
- `GET /api/band/messages`
  - Aggregates Band room messages from all configured agent views.

## Verification Performed

Passed:

- Python syntax check for:
  - `backend/main.py`
  - `agents/master_agent.py`
  - `agents/risk_agent.py`
  - `agents/compliance_agent.py`
  - `agents/proposer_agent.py`
  - `agents/console.py`
  - `agents/new_demo.py`
- FastAPI app import with backend venv.
- Local API smoke test:
  - `GET /api/health` returned 200.
  - `POST /api/features` returned 200.
  - `POST /api/actions/propose` returned HELD.
  - `POST /api/actions/{id}/decide` returned BLOCKED.
  - `GET /api/messages` returned expected audit entries.
- `GET /api/band/room` returned a room link from `agents/room.txt`.

Not tested:

- `POST /api/band/trigger`, because it requires network access and real Band API keys.
- `GET /api/band/messages`, because it calls Band external API.
- Full browser UI behavior with a running live Band room.

## Recommended Fix Order Before Demo

1. Make `BAND_ROOM` actually work everywhere.
2. Include Compliance in the default live handoff path.
3. Align README/SUBMISSION model-provider claims with the actual code.
4. Add clear Band config error handling.
5. Add simple demo auth token before public deployment.
6. Make one primary dashboard demo flow so judges do not need to understand two separate modes.
7. Add a 60-second demo script and record the exact happy path.

## Suggested Demo Script

1. Open dashboard.
2. Show connected status and Band room link.
3. Type: `Clean up inactive users; this may require DROP TABLE users.`
4. Click the live Band/demo button.
5. Show Proposer posting `PROPOSAL`.
6. Show Risk posting `RISK: HIGH`.
7. Show Compliance posting `COMPLIANCE: FAIL` or policy warning.
8. Show Master posting `DECISION: BLOCK`.
9. Show Emergency Brake still holding/blocking the dangerous action.
10. Close with: "Band is the coordination layer; NexusCore is the emergency brake."

## Bottom Line

The project is strong enough for the hackathon story, especially because the governance angle is more original than a normal chatbot or PR reviewer. The backend is readable for the team and the core local API works.

Before submission, the team should tighten the live Band demo path: make all 4 agents visibly participate, fix the room configuration mismatch, and make the dashboard show one clear end-to-end governance flow.
