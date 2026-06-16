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

## Run the Demo

You can run NexusCore in two modes depending on whether you are developing features or previewing the full application locally.

### 1. Development Mode (Recommended)

This mode runs the backend swarm using the unified launcher, and the frontend in Vite development mode with hot reloading.

#### Step A: Backend & Agents Swarm
Install the combined dependencies in a virtual environment at the root of the project and run the launcher:
```bash
# Create and activate a virtual environment at the root
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install combined backend and agent dependencies
pip install -r requirements.txt

# Run the launcher (starts FastAPI on port 8000 and launches the 4 agents)
python start.py
```
*(Note: Agent credentials/keys must be configured in environment variables or via `agents/agent_config.yaml` to run the agent subprocesses.)*

#### Step B: Frontend Dashboard
In a separate terminal, install the frontend Node dependencies and run the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open <http://localhost:5173>. The dev server automatically connects to the backend running at `http://localhost:8000`.

---

### 2. Production Preview Mode (Single Origin)

In this mode, the frontend is built into static assets and served directly by the FastAPI backend on port `8000`.

1. **Build the frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. **Start the backend server**:
   From the root directory, activate your Python virtual environment and run:
   ```bash
   python start.py
   ```
3. Open <http://localhost:8000> in your browser.

---

### Demo Flow

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
