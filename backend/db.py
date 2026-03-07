import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DB_URL", "postgresql://hackathon:hackathon@localhost:5432/hotel_hackathon")


def get_connection():
    return psycopg2.connect(DB_URL)


def run_sql(query: str, params: tuple = None) -> list[dict]:
    """Execute a SQL query and return rows as a list of dicts."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


def check_connection() -> bool:
    """Verify the database is reachable."""
    try:
        run_sql("SELECT 1")
        return True
    except Exception:
        return False
