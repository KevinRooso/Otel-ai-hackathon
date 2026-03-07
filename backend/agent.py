import json
import os
from pathlib import Path
import re
from typing import Any, cast

from dotenv import load_dotenv
from openai import OpenAI

from memory import memory
from tools import TOOLS, handle_tool

load_dotenv()

MODEL = "anthropic/claude-sonnet-4-6"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
FALLBACK_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

_client_cache: dict[str, OpenAI] = {}


def _get_client(api_key: str) -> OpenAI:
    if api_key not in _client_cache:
        _client_cache[api_key] = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=api_key)
    return _client_cache[api_key]


# ---------------------------------------------------------------------------
# Load SKILL.md files
# ---------------------------------------------------------------------------

def _load_skills() -> str:
    skills_dir = Path(__file__).parent / ".claude" / "skills"
    parts = []
    for skill_file in sorted(skills_dir.glob("*/SKILL.md")):
        parts.append(skill_file.read_text(encoding="utf-8"))
    return "\n\n---\n\n".join(parts)


SKILL_CONTEXT = _load_skills()

MORNING_BRIEFING_HINTS = (
    "morning briefing",
    "daily briefing",
    "what should i know today",
    "give me an overview",
    "what's the situation",
    "whats the situation",
)


CONCENTRATION_RISK_HINTS = (
    "concentration",
    "ota dependency",
    "ota risk",
    "diversification",
)


def _classify_skill(user_message: str, history: list | None = None) -> str:
    """Pick the primary skill to emphasize for this turn."""
    text = re.sub(r"\s+", " ", user_message.strip().lower())
    if any(phrase in text for phrase in MORNING_BRIEFING_HINTS):
        return "morning_briefing"

    if any(phrase in text for phrase in CONCENTRATION_RISK_HINTS):
        return "concentration_risk"

    if not history and text in {"briefing", "overview", "status"}:
        return "morning_briefing"

    return "revenue_analysis"


# ---------------------------------------------------------------------------
# System prompt builder (memory context is injected fresh each call)
# ---------------------------------------------------------------------------

def _build_system_prompt(active_skill: str) -> str:
    base = f"""You are Otel AI, a Revenue Intelligence assistant for a Hotel General Manager.

Your job is to detect what is changing in the hotel's future business, turn it into clear commercial judgment, and tell the GM what matters most, why it matters, and what action to take next.

You have access to tools that query live reservation data from the hotel's database. Always use the tools — never invent numbers.

{SKILL_CONTEXT}

Response style:
- Speak like a sharp revenue manager in a morning briefing — confident, direct, commercial
- Always include: the key number → what's driving it → the risk or opportunity → one recommended action
- Round revenue to nearest whole number, ADR to 2 decimal places, percentages to 1 decimal place
- State your assumption whenever date scope or cancellation handling is ambiguous
- Never present a number without context

Proactive Intelligence:
- After answering, suggest 2-3 follow-up questions the GM might want to explore
- Flag any emerging patterns you notice in the data (e.g. shifting segment mix, pickup trends)
- Where relevant, propose a brief strategy or next step the GM could take
"""

    if active_skill == "greeting":
        base += (
            "\n\nActive skill for this turn: Greeting Briefing. "
            "Produce a warm, concise morning greeting (~200 words). "
            "Do NOT use formal headers like '## Good morning' — keep it conversational. "
            "Call all 5 tools (get_otb_summary, get_pickup, get_cancellations, get_segment_mix, get_concentration_risk) "
            "but present the results casually, weaving data into a friendly narrative. "
            "End with 2-3 suggested questions the GM might want to explore."
        )
    elif active_skill == "morning_briefing":
        base += (
            "\n\nActive skill for this turn: Morning Briefing. "
            "Follow the Morning Briefing skill's workflow and structure. "
            "Use the five-tool snapshot unless the user explicitly asks for a narrower scope."
        )
    elif active_skill == "concentration_risk":
        base += (
            "\n\nActive skill for this turn: Concentration Risk Analysis. "
            "Focus on OTA dependency, segment diversification, and concentration risk. "
            "Use get_concentration_risk and get_segment_mix as primary tools. "
            "Highlight any segments exceeding safe thresholds and recommend diversification actions."
        )
    else:
        base += (
            "\n\nActive skill for this turn: Revenue Analysis. "
            "Follow the Revenue Analysis skill's metric definitions, guardrails, and tool selection guide. "
            "Choose the smallest set of tools that answers the question well. "
            "Be conversational — use markdown for structure but keep the tone friendly and direct."
        )

    mem_context = memory.get_context_string()
    if mem_context:
        base += f"\n\nGM context from previous sessions:\n{mem_context}"

    return base


# ---------------------------------------------------------------------------
# Core tool-use loop
# ---------------------------------------------------------------------------

def _run_tool_loop(client: OpenAI, messages: list, system_prompt: str) -> str:
    """Run the OpenAI tool-use loop until end_turn. Returns final text."""
    while True:
        request_messages = cast(Any, [{"role": "system", "content": system_prompt}] + messages)
        response = client.chat.completions.create(
            model=MODEL,
            messages=request_messages,
            tools=cast(Any, TOOLS),
            max_tokens=4096,
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls":
            assistant_message = choice.message
            tool_calls = assistant_message.tool_calls or []
            # Append assistant turn with tool calls
            function_tool_calls = [cast(Any, tc) for tc in tool_calls if getattr(tc, "type", None) == "function"]

            messages.append({
                "role": "assistant",
                "content": assistant_message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in function_tool_calls
                ],
            })

            # Execute all tool calls
            for tc in function_tool_calls:
                arguments = json.loads(tc.function.arguments)
                result = handle_tool(tc.function.name, arguments)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

        else:
            return choice.message.content or ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_agent(user_message: str, api_key: str | None = None, history: list | None = None) -> tuple[str, list]:
    """
    Run the agent for a single user message.

    Args:
        user_message: The GM's question.
        api_key: OpenRouter API key (falls back to .env).
        history: Prior conversation messages for multi-turn context.

    Returns:
        (response_text, updated_messages) — caller should store updated_messages
        and pass it back on the next call to maintain conversation context.
    """
    key = api_key or FALLBACK_API_KEY
    if not key:
        raise ValueError("No OpenRouter API key provided.")

    client = _get_client(key)
    active_skill = _classify_skill(user_message, history)
    system_prompt = _build_system_prompt(active_skill)

    messages = list(history or [])
    messages.append({"role": "user", "content": user_message})

    response_text = _run_tool_loop(client, messages, system_prompt)

    messages.append({"role": "assistant", "content": response_text})

    return response_text, messages


def run_morning_briefing(api_key: str | None = None) -> tuple[str, list]:
    """Run the morning briefing. Returns (text, messages) like run_agent."""
    return run_agent(
        "Generate this morning's revenue briefing. "
        "Call get_otb_summary, get_pickup, get_cancellations, get_segment_mix, "
        "and get_concentration_risk to build a complete picture. "
        "Synthesise into a structured briefing with the #1 action item.",
        api_key=api_key,
        history=[],
    )


def run_greeting_briefing(api_key: str | None = None) -> tuple[str, list]:
    """Run a warm, conversational greeting briefing. Returns (text, messages) like run_agent."""
    key = api_key or FALLBACK_API_KEY
    if not key:
        raise ValueError("No OpenRouter API key provided.")

    client = _get_client(key)
    system_prompt = _build_system_prompt(active_skill="greeting")

    messages: list = []
    messages.append({
        "role": "user",
        "content": (
            "Generate a warm, concise morning greeting for the GM. "
            "Call all 5 tools (get_otb_summary, get_pickup, get_cancellations, "
            "get_segment_mix, get_concentration_risk) for maximum data. "
            "Present the highlights conversationally in ~200 words — no formal headers, "
            "just a friendly briefing. End with 2-3 suggested questions the GM might want to explore."
        ),
    })

    response_text = _run_tool_loop(client, messages, system_prompt)
    messages.append({"role": "assistant", "content": response_text})

    return response_text, messages
