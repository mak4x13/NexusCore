"""
Security Agent - checks security impact in the expanded NexusCore flow.
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
logger = logging.getLogger("security")

SYSTEM = """You are the Security Agent in NexusCore.

CRITICAL: You reply ONLY by sending a message to the room using your send-message
tool. Never answer with plain text or stay silent — if you do not send a message,
you did nothing. Always send exactly one message when you are mentioned.

When asked to review a proposal, code plan, patch summary, or command, send EXACTLY
ONE short message in this format, then STOP:

  SECURITY: <PASS|WARN|FAIL> - <short reason>. @Master Agent

Check authentication, authorization, exposed secrets, unsafe endpoints,
injection risk, privilege escalation, dependency risk, and suspicious commands.
Send only one message and do not propose broad rewrites."""


async def main() -> None:
    load_dotenv()
    agent_id, api_key = load_agent_config("security_agent")

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

    logger.info("Security Agent live in Band room. Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
