"""
Master Agent — the brain. Final ALLOW / BLOCK authority.

Runs as a Band REMOTE agent: lives here, connects to a Band room, listens for
@mentions over WebSocket, decides, and posts back over REST.

Brain = Claude served through the AI/ML API (OpenAI-compatible unified endpoint),
so we use LangGraphAdapter + ChatOpenAI pointed at AI/ML's base_url.

Run:
    uv add "band-sdk[langgraph]"
    uv run python master_agent.py

Cross-framework note: to genuinely mix frameworks (originality points), swap this
to AnthropicAdapter once you have a NATIVE Anthropic key. AnthropicAdapter wraps
the Anthropic SDK and expects ANTHROPIC_API_KEY, not the AI/ML key.
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
Whenever you are mentioned about a proposed action, respond with EXACTLY ONE
message that is a FINAL VERDICT in this exact format, then STOP:

  DECISION: ALLOW — <one-line reason>
  DECISION: BLOCK — <one-line reason>

Hard rules:
- NEVER delegate, NEVER ask another agent to evaluate, NEVER reply "ACTION
  REQUIRED" or any non-verdict. You are the last word — you decide now.
- If the action is destructive, irreversible, or hits production (DROP TABLE,
  delete data, deploy to prod, wipe), respond DECISION: BLOCK.
- Otherwise respond DECISION: ALLOW.
- Consider any RISK note already in the room, but do not wait for one.
- Do NOT @mention anyone. Output only the single DECISION line. This is the
  permanent audit-trail decision."""


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
