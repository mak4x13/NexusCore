# Deploy NexusCore to Render (one URL, backend + agents)

One Render web service runs the backend **and** the 4 Band agents (`start.py`).
Secrets live in Render env vars — never in git.

## Before you deploy

1. Create a demo room and let the agents join it (locally, once):
   ```bash
   python agents/new_demo.py
   ```
   Copy the room id it prints — that is your `BAND_ROOM`.

2. **Stop your local agents.** Band allows one execution per agent per room, so the
   deployed agents and local agents cannot run with the same keys at the same time.

## Steps

1. Push the repo (already done): `github.com/mak4x13/NexusCore`.
2. Go to <https://render.com> → **New → Blueprint** → connect the repo.
   Render reads `render.yaml` and creates the service.
   (Or **New → Web Service**: build `pip install -r requirements.txt`,
   start `python start.py`, Python 3.12.)
3. In the service **Environment**, set these (values from your local
   `agents/agent_config.yaml` and `backend/.env` — do not paste them anywhere public):

   | Env var | Where to get it |
   |---------|-----------------|
   | `AIML_API_KEY` | `backend/.env` |
   | `FEATHERLESS_API_KEY` | `backend/.env` |
   | `BAND_MASTER_UUID` / `BAND_MASTER_KEY` | `agent_config.yaml` → master_agent |
   | `BAND_RISK_UUID` / `BAND_RISK_KEY` | `agent_config.yaml` → risk_agent |
   | `BAND_COMPLIANCE_UUID` / `BAND_COMPLIANCE_KEY` | `agent_config.yaml` → compliance_agent |
   | `BAND_PROPOSER_UUID` / `BAND_PROPOSER_KEY` | `agent_config.yaml` → proposer_agent |
   | `BAND_ROOM` | the room id from `new_demo.py` |
   | `DEMO_TOKEN` | any secret string (protects write endpoints) — optional |

4. Deploy. When live, open the Render URL → the dashboard loads, agents are live,
   "▶ Run on Band" works, audit feed mirrors the room.

## Share with the team / judges

- Give them the **Render URL** only. They see everything live — no keys, no local setup.
- If you set `DEMO_TOKEN`, the dashboard asks for it once on the first write.

## Notes / limits (honest)

- **Free tier sleeps** after ~15 min idle → agents stop. Open the URL a few minutes
  before demoing to wake + reconnect (pre-warm).
- **512MB RAM** may be tight for 4 agents + langchain. If the service OOMs, upgrade to
  the **Starter** plan ($7/mo) or set `RUN_AGENTS=0` and run agents on a separate host.
- The room can get "noisy" after many runs — create a fresh one with `new_demo.py` and
  update `BAND_ROOM` for a clean demo.
