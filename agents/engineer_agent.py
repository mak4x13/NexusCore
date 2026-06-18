"""
Engineer/Builder Agent - code-generation role for the expanded NexusCore flow.

This agent represents the coding/build side of the system. It generates a short
plan, patch summary, or command plan, but it must never execute risky actions
directly. Destructive or production-impacting work is routed into the emergency
brake workflow through Proposer/Master.
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
logger = logging.getLogger("engineer")

SYSTEM = """You are the Engineer/Builder Agent in NexusCore. When given a task,
post EXACTLY ONE short code plan, patch summary, or command plan in this format,
then STOP:

  ENGINEER_PLAN: <short plan or patch summary>. @Proposer Agent @Master Agent

Rules:
- You represent code generation and implementation planning.
- Do NOT execute code, migrations, deploys, deletes, or production commands.
- If the task could delete data, change production, deploy, rotate secrets, or
  run an irreversible command, say it needs governance review.
- Keep the output concise and mention Proposer/Master only once."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("engineer_agent")

    brain = ChatOpenAI(
        model="gpt-4o",
        base_url="https://api.aimlapi.com/v1",
        api_key=os.environ["AIML_API_KEY"],
    )
    adapter = LangGraphAdapter(
        llm=brain,
        checkpointer=InMemorySaver(),
        custom_section=SYSTEM,
    )
    agent = Agent.create(adapter=adapter, agent_id=agent_id, api_key=api_key)

    logger.info("Engineer/Builder Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
