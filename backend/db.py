import os
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DB_URL", "postgresql://hackathon:hackathon@localhost:5433/hotel_hackathon")

_pool: pool.ThreadedConnectionPool | None = None


def _get_pool() -> pool.ThreadedConnectionPool:
    """Lazy-initialize the connection pool on first use."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = pool.ThreadedConnectionPool(minconn=2, maxconn=10, dsn=DB_URL)
    return _pool


def get_connection():
    return _get_pool().getconn()


def release_connection(conn):
    """Return a connection to the pool."""
    _get_pool().putconn(conn)


def run_sql(query: str, params: tuple = None) -> list[dict]:
    """Execute a SQL query and return rows as a list of dicts."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            conn.commit()
            return [dict(row) for row in cur.fetchall()]
    except Exception:
        conn.rollback()
        raise
    finally:
        release_connection(conn)


def check_connection() -> bool:
    """Verify the database is reachable."""
    try:
        run_sql("SELECT 1")
        return True
    except Exception:
        return False
