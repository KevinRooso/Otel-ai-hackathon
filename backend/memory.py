import json
from datetime import datetime
from pathlib import Path

MEMORY_FILE = Path(__file__).parent / "memory.json"
MAX_SESSION_LOG = 10  # keep last N session summaries


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
            return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        return {"preferences": {}, "thresholds": {}, "session_log": []}

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

    def clear(self):
        self._data = {"preferences": {}, "thresholds": {}, "session_log": []}
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

        return "\n".join(parts)


# Singleton — import and use directly
memory = MemoryStore()
