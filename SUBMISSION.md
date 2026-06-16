# NexusCore — Band of Agents Hackathon Submission

**The governance brain that sits above your AI coding agents.**

> "Amazon's agent had no brain above it. NexusCore is that brain."

---

## 1. The Problem

Enterprises now run dozens of AI coding agents (Copilot, Cursor, Claude Code) with
**nothing governing them**. The result is already in the headlines:

- **Amazon (Dec 2025):** an AI agent deleted a production environment. 13h outage.
- **Replit (Jul 2025):** an AI agent wiped 1,200 companies' database, then faked data to hide it.
- 1 in 5 enterprise breaches now involves AI-generated code.

The common root cause: agents take **destructive actions** with no layer above them
to stop and review first.

## 2. The Solution

NexusCore puts a multi-agent **governance layer** above the work. The key idea is an
**emergency brake**: an agent never executes a dangerous action directly — it
*proposes* the action, the proposal is **held**, the other agents debate it in the
Band room, and only a final **ALLOW / BLOCK** decision lets it through. Every message
is the audit trail.

This is not "another code reviewer." It is a runtime decision gate on dangerous
**actions**, which is exactly what the Amazon / Replit failures needed.

## 3. The Agents (4, collaborating through Band)

| Agent | Role | Brain |
|-------|------|-------|
| **Proposer** | Implements the task; states dangerous steps as a PROPOSAL | GPT-4o (AI/ML API) |
| **Risk** | Assesses the proposal: HIGH/MED/LOW, reversible?, hits prod? | Qwen2.5-72B (Featherless) |
| **Compliance** | Checks the action/code against the approved spec | GPT-4o-mini (AI/ML API) |
| **Master** | Final authority: posts DECISION: ALLOW / BLOCK | GPT-4o (AI/ML API) |

## 4. How Band Is the Collaboration Layer (not a wrapper)

Every agent is a Band **remote agent**: it runs in our environment with its own LLM,
connects to one shared Band **chat room**, and collaborates through **@mention
routing**. Collaboration happens *inside* Band, live:

```
Engineer/Master → @Proposer implement cleanup (may DROP users table)
   @Proposer    → PROPOSAL: DROP users table to remove old accounts. @Risk @Compliance @Master
   @Risk        → RISK: HIGH — irreversible, hits production data. @Master
   @Compliance  → COMPLIANCE: FAIL — violates production data retention policy. @Master
   @Master      → DECISION: BLOCK — destructive, no rollback, production impact.
```

- **Handoffs:** agents @mention each other to pass work (Proposer→Risk/Compliance→Master).
- **Shared context / task state:** the room IS the shared memory + audit trail; Band's
  `band_send_event` and execution tracking carry task state.
- **Discovery:** Master can use `band_lookup_peers` / `band_add_participant` to pull in
  the right agent rather than a hardcoded pipeline.

## 5. Cross-Framework (the hackathon's namesake)

Agents run on **different providers and models** — GPT-4o / GPT-4o-mini via the AI/ML
API and Qwen2.5-72B via Featherless — yet collaborate in the same Band room. This is
genuine cross-framework collaboration, supported natively because Band agents keep their
own runtime and LLM.

## 6. Architecture

```
                 ┌──────────────── BAND ROOM ────────────────┐
 Dashboard ───►  │  Master(GPT-4o)  Risk  Compliance  Proposer │
 (FastAPI +      │       ▲ @mention handoffs + audit trail     │
  /api/band/     └───────────────────────────────────────────┘
  trigger)              each agent: WebSocket(listen) + REST(send)
```

- `agents/` — 4 Band remote agents (Python, `band-sdk[langgraph]`)
- `backend/` — FastAPI: governance API, live dashboard feed, and `/api/band/trigger`
  that injects a request straight into the live Band room
- `frontend/` — dashboard: feature input, "▶ Live Band" trigger, emergency-brake panel
- `agents/console.py` — CLI to drive the room programmatically

## 7. Run It

```bash
# Agents (Python 3.11+, uv): one terminal each
cd agents && uv venv --python 3.12 .venv && uv pip install -r requirements.txt
python master_agent.py   # + risk_agent.py, compliance_agent.py, proposer_agent.py

# Dashboard
cd backend && pip install -r requirements.txt && python main.py   # http://localhost:8000
```

Then in the Band room (or the dashboard "▶ Live Band" button):
`@Proposer Agent implement user cleanup, we may need to DROP the users table`

## 8. Why It Wins (mapped to judging criteria)

| Criterion | How NexusCore scores |
|-----------|----------------------|
| **Application of Technology** | Real @mention handoffs, shared room context, task state & audit via Band; agents specialized by role |
| **Presentation** | Clear story (Amazon/Replit) + visible Proposer→Risk/Compliance→Master flow + dashboard |
| **Business Value** | Stops destructive AI actions before production — a real, costly enterprise risk |
| **Originality** | Cross-provider brains (GPT-4o/GPT-4o-mini + Qwen2.5), agents escalate & decide — beyond linear automation |

## 9. Status

- [x] 4 remote agents live in a Band room, collaborating via @mention
- [x] Cross-framework: GPT-4o / GPT-4o-mini (AI/ML) + Qwen2.5-72B (Featherless), verified
- [x] Emergency-brake flow: Proposer → Risk/Compliance → Master ALLOW/BLOCK
- [x] FastAPI dashboard + live Band trigger
- [ ] Demo video + screenshots
