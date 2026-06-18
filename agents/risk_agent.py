"""
Risk Agent — the guard. Spots danger and escalates.

Runs as a Band REMOTE agent. Brain = a lighter open-source model (Featherless)
to save premium credits; Featherless is OpenAI-compatible, so we point a normal
OpenAI client at its base_url.

Run:
    uv add "band-sdk[langgraph]"
    uv run python risk_agent.py
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
from respond_once import RespondOncePreprocessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("risk")

SYSTEM = """You are the Risk Agent in NexusCore. When an action is proposed, post
EXACTLY ONE short message in this format, then STOP:

  RISK: <HIGH|MEDIUM|LOW> — <what breaks, is it reversible, does it hit production>. @Master Agent

Do not propose solutions. Do not @mention the Proposer. Send only one message."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("risk_agent")

    # Featherless = open-source model behind an OpenAI-compatible endpoint.
    brain = ChatOpenAI(
        model="Qwen/Qwen2.5-72B-Instruct",  # strong tool-use, verified on Featherless
        base_url="https://api.featherless.ai/v1",
        api_key=os.environ["FEATHERLESS_API_KEY"],
    )
    adapter = LangGraphAdapter(
        llm=brain,
        checkpointer=InMemorySaver(),
        custom_section=SYSTEM,
    )
    agent = Agent.create(adapter=adapter, agent_id=agent_id, api_key=api_key,
                         preprocessor=RespondOncePreprocessor())

    logger.info("Risk Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
