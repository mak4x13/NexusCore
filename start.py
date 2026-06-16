"""
start.py — single-process launcher for Render (backend + 4 Band agents).

Render gives one web service. We:
  1. Build agents/agent_config.yaml from environment variables (no secrets in git).
  2. Launch the 4 remote agents as background subprocesses.
  3. Run the FastAPI backend in the foreground bound to $PORT.

LLM keys (AIML_API_KEY, FEATHERLESS_API_KEY) and Band keys are read from the
environment (set them in the Render dashboard). Nothing secret is committed.

Required env vars:
  AIML_API_KEY, FEATHERLESS_API_KEY
  BAND_MASTER_UUID,     BAND_MASTER_KEY
  BAND_RISK_UUID,       BAND_RISK_KEY
  BAND_COMPLIANCE_UUID, BAND_COMPLIANCE_KEY
  BAND_PROPOSER_UUID,   BAND_PROPOSER_KEY
  BAND_ROOM            (the demo room id the agents already joined)
Optional:
  DEMO_TOKEN           (protect write endpoints)
  PORT                 (provided by Render; defaults to 8000 locally)
  RUN_AGENTS=0         (skip launching agents — backend only)
"""

import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
AGENTS_DIR = os.path.join(ROOT, "agents")
CONFIG_PATH = os.path.join(AGENTS_DIR, "agent_config.yaml")

_AGENTS = [
    ("master_agent", "BAND_MASTER_UUID", "BAND_MASTER_KEY"),
    ("risk_agent", "BAND_RISK_UUID", "BAND_RISK_KEY"),
    ("compliance_agent", "BAND_COMPLIANCE_UUID", "BAND_COMPLIANCE_KEY"),
    ("proposer_agent", "BAND_PROPOSER_UUID", "BAND_PROPOSER_KEY"),
]


def write_agent_config() -> bool:
    """Generate agent_config.yaml from env. Returns True if all agents present."""
    lines, complete = [], True
    for name, uuid_env, key_env in _AGENTS:
        uuid, key = os.environ.get(uuid_env), os.environ.get(key_env)
        if not uuid or not key:
            complete = False
            continue
        lines.append(f'{name}:\n  agent_id: "{uuid}"\n  api_key: "{key}"\n')
    if lines:
        with open(CONFIG_PATH, "w") as f:
            f.write("\n".join(lines))
    return complete


def launch_agents() -> list:
    procs = []
    for name, _, _ in _AGENTS:
        script = os.path.join(AGENTS_DIR, f"{name}.py")
        if not os.path.exists(script):
            continue
        p = subprocess.Popen([sys.executable, script], cwd=AGENTS_DIR)
        procs.append((name, p))
        time.sleep(2)  # stagger so Band joins do not collide
    return procs


def main() -> None:
    has_band = write_agent_config()
    run_agents = os.environ.get("RUN_AGENTS", "1") != "0"

    if run_agents and has_band:
        print("Launching 4 Band agents...", flush=True)
        launch_agents()
    else:
        print("Backend only (Band agents not launched: missing keys or RUN_AGENTS=0).",
              flush=True)

    port = os.environ.get("PORT", "8000")
    os.chdir(os.path.join(ROOT, "backend"))
    # exec uvicorn in the foreground so Render tracks the web process
    os.execvp(sys.executable, [
        sys.executable, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0", "--port", port,
    ])


if __name__ == "__main__":
    main()
