"""
start.py - single-process launcher for Render/local (backend + Band agents).

Render gives one web service. We:
  1. Build agents/agent_config.yaml from environment variables (no secrets in git).
  2. Launch configured remote agents as background subprocesses.
  3. Run the FastAPI backend in the foreground bound to $PORT.

LLM keys (AIML_API_KEY, FEATHERLESS_API_KEY) and Band keys are read from the
environment (set them in the Render dashboard). Nothing secret is committed.

Required env vars:
  AIML_API_KEY, FEATHERLESS_API_KEY
  Core 4-agent MVP:
  BAND_MASTER_UUID,     BAND_MASTER_KEY
  BAND_RISK_UUID,       BAND_RISK_KEY
  BAND_COMPLIANCE_UUID, BAND_COMPLIANCE_KEY
  BAND_PROPOSER_UUID,   BAND_PROPOSER_KEY
  Optional expanded agents:
  BAND_ENGINEER_UUID,        BAND_ENGINEER_KEY
  BAND_SECURITY_UUID,        BAND_SECURITY_KEY
  BAND_TEST_UUID,            BAND_TEST_KEY
  BAND_INFRASTRUCTURE_UUID,  BAND_INFRASTRUCTURE_KEY
  BAND_ROLLBACK_AUDIT_UUID,  BAND_ROLLBACK_AUDIT_KEY
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

import yaml
from dotenv import load_dotenv

ROOT = os.path.dirname(os.path.abspath(__file__))
AGENTS_DIR = os.path.join(ROOT, "agents")
CONFIG_PATH = os.path.join(AGENTS_DIR, "agent_config.yaml")

_AGENTS = [
    ("master_agent", "BAND_MASTER_UUID", "BAND_MASTER_KEY"),
    ("engineer_agent", "BAND_ENGINEER_UUID", "BAND_ENGINEER_KEY"),
    ("risk_agent", "BAND_RISK_UUID", "BAND_RISK_KEY"),
    ("compliance_agent", "BAND_COMPLIANCE_UUID", "BAND_COMPLIANCE_KEY"),
    ("proposer_agent", "BAND_PROPOSER_UUID", "BAND_PROPOSER_KEY"),
    ("security_agent", "BAND_SECURITY_UUID", "BAND_SECURITY_KEY"),
    ("test_agent", "BAND_TEST_UUID", "BAND_TEST_KEY"),
    ("infrastructure_agent", "BAND_INFRASTRUCTURE_UUID", "BAND_INFRASTRUCTURE_KEY"),
    ("rollback_audit_agent", "BAND_ROLLBACK_AUDIT_UUID", "BAND_ROLLBACK_AUDIT_KEY"),
]


def load_local_env() -> None:
    """Support local .env files while keeping Render env vars authoritative."""
    load_dotenv(os.path.join(ROOT, "backend", ".env"))
    load_dotenv(os.path.join(ROOT, "agents", ".env"))


def configured_agent_names() -> list[str]:
    """Return configured agent names from agents/agent_config.yaml."""
    try:
        with open(CONFIG_PATH) as f:
            cfg = yaml.safe_load(f) or {}
    except (OSError, yaml.YAMLError):
        return []
    names = []
    for name, _, _ in _AGENTS:
        entry = cfg.get(name)
        if isinstance(entry, dict) and entry.get("agent_id") and entry.get("api_key"):
            names.append(name)
    return names


def write_agent_config() -> bool:
    """Generate agent_config.yaml from env. Returns True if any agent is present."""
    config = {}
    for name, uuid_env, key_env in _AGENTS:
        uuid, key = os.environ.get(uuid_env), os.environ.get(key_env)
        if not uuid or not key:
            continue
        config[name] = {"agent_id": uuid, "api_key": key}
    if config:
        with open(CONFIG_PATH, "w") as f:
            yaml.safe_dump(config, f, sort_keys=False)
    return bool(config)


def launch_agents(names: list[str]) -> list:
    procs = []
    for name in names:
        script = os.path.join(AGENTS_DIR, f"{name}.py")
        if not os.path.exists(script):
            continue
        p = subprocess.Popen([sys.executable, script], cwd=AGENTS_DIR)
        procs.append((name, p))
        time.sleep(2)  # stagger so Band joins do not collide
    return procs


def main() -> None:
    load_local_env()
    write_agent_config()
    configured = configured_agent_names()
    run_agents = os.environ.get("RUN_AGENTS", "1") != "0"

    if run_agents and configured:
        print(f"Launching {len(configured)} Band agents...", flush=True)
        launch_agents(configured)
    else:
        print("Backend only (Band agents not launched: missing keys or RUN_AGENTS=0).",
              flush=True)

    port = os.environ.get("PORT", "8000")
    os.chdir(os.path.join(ROOT, "backend"))
    uvicorn_cmd = [
        sys.executable, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0", "--port", port,
    ]
    if os.name == "nt":
        subprocess.run(uvicorn_cmd, check=True)
    else:
        # exec uvicorn in the foreground so Render tracks the web process
        os.execvp(sys.executable, uvicorn_cmd)


if __name__ == "__main__":
    main()
