"""
Master Agent — the brain. Final ALLOW / BLOCK authority.

Runs as a Band REMOTE agent: lives here, connects to a Band room, listens for
@mentions over WebSocket, decides, and posts back over REST.

Brain = GPT-4o served through the AI/ML API (OpenAI-compatible unified endpoint),
so we use LangGraphAdapter + ChatOpenAI pointed at AI/ML's base_url.

Run:
    uv add "band-sdk[langgraph]"
    uv run python master_agent.py

Cross-provider note: NexusCore mixes AI/ML API models with Featherless models in
other agents while coordinating through the same Band room.
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
logger = logging.getLogger("master")

SYSTEM = """You are the Master Agent in NexusCore, the final governance authority.

CRITICAL — HOW YOU REPLY: You respond ONLY by sending a message to the room using
your send-message tool. NEVER answer with plain text, reasoning, an empty turn, or
silence. If you do not send a message, governance fails. Every time you are
mentioned you MUST send exactly one message.

WHEN TO DECIDE: The moment you see a PROPOSAL (or any reviewer verdict) that
mentions you, send your FINAL VERDICT immediately. Do NOT wait for other reviewers
— the proposal alone is enough to decide.

FORMAT (send exactly one of these):
  DECISION: ALLOW — <one-line reason>
  DECISION: BLOCK — <one-line reason>

Rules:
- If the action is destructive, irreversible, or hits production (DROP TABLE,
  delete data, deploy to prod, wipe), send DECISION: BLOCK.
- Otherwise send DECISION: ALLOW.
- NEVER delegate, NEVER ask anyone to evaluate, NEVER reply "ACTION REQUIRED".
- Do NOT @mention anyone. Send only the single DECISION line.
- Send exactly ONE DECISION per proposal: if you have already sent a DECISION for
  the current proposal in this room's history, do not send another."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("master_agent")

    # Brain via AI/ML API (OpenAI-compatible). gpt-4o: native OpenAI tool-calling,
    # avoids Anthropic's tool-name length limit hit when proxying Claude tools.
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

    logger.info("Master Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
