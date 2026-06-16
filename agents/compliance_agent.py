"""
Compliance Agent — the spec enforcer.

Reads the approved spec and the final action/code in the room, then checks the
code actually does what was planned (nothing missing, nothing extra). Brain runs
on Featherless (open-source, OpenAI-compatible endpoint).

Run:
    uv add "band-sdk[langgraph]"
    uv run python compliance_agent.py
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from band import Agent
from band.adapters.langgraph import LangGraphAdapter
from band.config import load_agent_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("compliance")

SYSTEM = """You are the Compliance Agent in NexusCore. When asked, compare the
action/code to the approved spec and post EXACTLY ONE short message, then STOP:

  COMPLIANCE: <PASS|FAIL> — <note, or what is missing/extra>. @Master Agent

Do not @mention the Proposer. Send only one message."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("compliance_agent")

    brain = ChatOpenAI(
        model="gpt-4o-mini",                      # AI/ML — cheap, reliable tool-use
        base_url="https://api.aimlapi.com/v1",
        api_key=os.environ["AIML_API_KEY"],
    )
    adapter = LangGraphAdapter(
        llm=brain,
        checkpointer=InMemorySaver(),
        custom_section=SYSTEM,
    )
    agent = Agent.create(adapter=adapter, agent_id=agent_id, api_key=api_key)

    logger.info("Compliance Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
