import json
from datetime import datetime
from pathlib import Path

MEMORY_FILE = Path(__file__).parent / "memory.json"
MAX_SESSION_LOG = 10  # keep last N session summaries
MAX_TRANSCRIPTS = 12


class MemoryStore:
    """
    Lightweight persistent memory for the GM agent.

    Stores GM preferences and custom thresholds across sessions.
    NEVER stores revenue data or query results — those always come from the live DB.
    """

    def __init__(self):
        self._data = self._load()

    def _load(self) -> dict:
        if MEMORY_FILE.exists():
            raw = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
            return {
                "preferences": raw.get("preferences", {}),
                "thresholds": raw.get("thresholds", {}),
                "session_log": raw.get("session_log", []),
                "session_transcripts": raw.get("session_transcripts", []),
            }
        return {
            "preferences": {},
            "thresholds": {},
            "session_log": [],
            "session_transcripts": [],
        }

    def _save(self):
        MEMORY_FILE.write_text(
            json.dumps(self._data, indent=2, default=str), encoding="utf-8"
        )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def set_preference(self, key: str, value: str):
        """Store a GM preference (e.g. 'output_format': 'bullet points')."""
        self._data["preferences"][key] = value
        self._save()

    def set_threshold(self, key: str, value: str):
        """Store a custom threshold (e.g. 'ota_target': '25%')."""
        self._data["thresholds"][key] = value
        self._save()

    def log_session(self, key_insight: str):
        """Log the key takeaway from this session for next-session context."""
        self._data["session_log"].append({
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "insight": key_insight,
        })
        self._data["session_log"] = self._data["session_log"][-MAX_SESSION_LOG:]
        self._save()

    def log_session_turn(self, user_message: str, assistant_message: str):
        """Store a compact transcript turn for cross-session continuity."""
        cleaned_assistant = " ".join((assistant_message or "").split())
        cleaned_user = " ".join((user_message or "").split())
        self._data["session_transcripts"].append({
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "user": cleaned_user[:240],
            "assistant": cleaned_assistant[:400],
        })
        self._data["session_transcripts"] = self._data["session_transcripts"][-MAX_TRANSCRIPTS:]
        self._save()

    def clear(self):
        self._data = {
            "preferences": {},
            "thresholds": {},
            "session_log": [],
            "session_transcripts": [],
        }
        self._save()

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_all(self) -> dict:
        return self._data

    def get_context_string(self) -> str:
        """
        Returns a compact string injected into the system prompt.
        Empty string if nothing is stored.
        """
        parts = []

        if self._data["preferences"]:
            prefs = "; ".join(f"{k}: {v}" for k, v in self._data["preferences"].items())
            parts.append(f"GM preferences: {prefs}")

        if self._data["thresholds"]:
            thresh = "; ".join(f"{k}: {v}" for k, v in self._data["thresholds"].items())
            parts.append(f"Custom thresholds: {thresh}")

        if self._data["session_log"]:
            recent = self._data["session_log"][-3:]
            log = " | ".join(f"[{e['date']}] {e['insight']}" for e in recent)
            parts.append(f"Recent session notes: {log}")

        if self._data["session_transcripts"]:
            recent_turns = self._data["session_transcripts"][-3:]
            turns = " | ".join(
                f"[{entry['date']}] User: {entry['user']} -> Assistant: {entry['assistant']}"
                for entry in recent_turns
            )
            parts.append(f"Recent cross-session conversation turns: {turns}")

        return "\n".join(parts)


# Singleton — import and use directly
memory = MemoryStore()
