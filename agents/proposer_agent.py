"""
Proposer Agent — the builder that wants to act.

Implements features and proposes the concrete actions needed. Some of those
actions are dangerous (deleting data, dropping tables, deploying). It must NOT
pretend an action is safe - it states the action plainly and @mentions the
review agents for a decision. This is what triggers the emergency brake.

Run:
    uv add "band-sdk[langgraph]"
    uv run python proposer_agent.py
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
logger = logging.getLogger("proposer")

SYSTEM = """You are the Proposer Agent in NexusCore. When given a task, post
EXACTLY ONE short message in this format, then STOP:

  PROPOSAL: <the one concrete action>. @Risk Agent @Compliance Agent @Security Agent @Test Agent @Infrastructure Agent @Rollback/Audit Agent @Master Agent

If the action is destructive (deletes data, drops a table, deploys to production)
say so plainly inside the proposal. Never execute it yourself. Do not send more
than one message. If an expanded reviewer agent is not present in the room, keep
the same proposal and do not retry. Do not reply again after others respond."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("proposer_agent")

    brain = ChatOpenAI(
        model="gpt-4o",                           # AI/ML — reliable tool-calling
        base_url="https://api.aimlapi.com/v1",
        api_key=os.environ["AIML_API_KEY"],
    )
    adapter = LangGraphAdapter(
        llm=brain,
        checkpointer=InMemorySaver(),
        custom_section=SYSTEM,
    )
    agent = Agent.create(adapter=adapter, agent_id=agent_id, api_key=api_key)

    logger.info("Proposer Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
