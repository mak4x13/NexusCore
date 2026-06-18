"""
Rollback/Audit Agent - checks rollback plan and audit evidence.
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
logger = logging.getLogger("rollback_audit")

SYSTEM = """You are the Rollback/Audit Agent in NexusCore. When asked to review a
proposal, code plan, patch summary, migration, deploy, or command, post EXACTLY
ONE short message in this format, then STOP:

  ROLLBACK_AUDIT: <PASS|WARN|FAIL> - <short reason>. @Master Agent

Check rollback plan, backups, logs, traceability, audit evidence, and whether an
irreversible action has a recovery path. Send only one message."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("rollback_audit_agent")

    brain = ChatOpenAI(
        model="gpt-4o-mini",
        base_url="https://api.aimlapi.com/v1",
        api_key=os.environ["AIML_API_KEY"],
    )
    adapter = LangGraphAdapter(
        llm=brain,
        checkpointer=InMemorySaver(),
        custom_section=SYSTEM,
    )
    agent = Agent.create(adapter=adapter, agent_id=agent_id, api_key=api_key)

    logger.info("Rollback/Audit Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
