import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from memory import memory
from tools import TOOLS, handle_tool

load_dotenv()

MODEL = "anthropic/claude-sonnet-4-6"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
FALLBACK_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


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


# ---------------------------------------------------------------------------
# System prompt builder (memory context is injected fresh each call)
# ---------------------------------------------------------------------------

def _build_system_prompt() -> str:
    base = f"""You are a Revenue Manager Agent for a Hotel General Manager.

Your job is to detect what is changing in the hotel's future business, turn it into clear commercial judgment, and tell the GM what matters most, why it matters, and what action to take next.

You have access to tools that query live reservation data from the hotel's database. Always use the tools — never invent numbers.

{SKILL_CONTEXT}

Response style — Morning Briefing:
- Speak like a sharp revenue manager in a morning briefing — confident, direct, commercial
- Always include: the key number → what's driving it → the risk or opportunity → one recommended action
- Round revenue to nearest whole number, ADR to 2 decimal places, percentages to 1 decimal place
- State your assumption whenever date scope or cancellation handling is ambiguous
- Never present a number without context

Response style — Follow-up Chat Questions:
- Lead with the direct answer in 1–2 sentences — no preamble
- Support with up to 3 specific numbers or facts; use a table only if the question is explicitly comparative
- Keep total response under 180 words unless the user asks for full detail or a breakdown
- End with one short offer to go deeper: e.g. "Want me to break this down by month?" — only if genuinely useful
- Do NOT restate the question or explain what you are about to do — just answer
"""
    mem_context = memory.get_context_string()
    if mem_context:
        base += f"\n\nGM context from previous sessions:\n{mem_context}"

    return base


# ---------------------------------------------------------------------------
# Core tool-use loop
# ---------------------------------------------------------------------------

def _run_tool_loop(client: OpenAI, messages: list) -> str:
    """Run the OpenAI tool-use loop until end_turn. Returns final text."""
    while True:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": _build_system_prompt()}] + messages,
            tools=TOOLS,
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls":
            assistant_message = choice.message
            # Append assistant turn with tool calls
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in assistant_message.tool_calls
                ],
            })

            # Execute all tool calls
            for tc in assistant_message.tool_calls:
                arguments = json.loads(tc.function.arguments)
                result = handle_tool(tc.function.name, arguments)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

        else:
            return choice.message.content


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_agent(user_message: str, api_key: str = None, history: list = None) -> tuple[str, list]:
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

    client = OpenAI(base_url=OPENROUTER_BASE_URL, api_key=key)

    messages = list(history or [])
    messages.append({"role": "user", "content": user_message})

    response_text = _run_tool_loop(client, messages)

    messages.append({"role": "assistant", "content": response_text})

    return response_text, messages


def run_morning_briefing(api_key: str = None) -> tuple[str, list]:
    """Run the morning briefing. Returns (text, messages) like run_agent."""
    return run_agent(
        "Generate this morning's revenue briefing. "
        "Call get_otb_summary, get_pickup, get_cancellations, and get_segment_mix.",
        api_key=api_key,
        history=[],
    )
