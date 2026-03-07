import json
from decimal import Decimal
from db import run_sql
from memory import memory

# ---------------------------------------------------------------------------
# OpenAI function-calling tool definitions
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_otb_summary",
            "description": (
                "Get revenue on the books by month for future stay dates. "
                "Returns room nights, total revenue, and ADR per month. "
                "Excludes cancelled reservations. Use for OTB, revenue position, "
                "monthly revenue questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "months_ahead": {
                        "type": "integer",
                        "description": "How many months ahead to include. Default 5 to cover full horizon.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pickup",
            "description": (
                "Get new reservations booked in the last N days for future stay dates. "
                "Use for pickup analysis, 'what changed recently', 'what was booked this week'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to look back from now. Default 7.",
                    },
                    "stay_month": {
                        "type": "string",
                        "description": "Optional. Filter to a specific stay month in YYYY-MM format.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cancellations",
            "description": (
                "Get cancellations in the last N days and the stay months they affected. "
                "Use for cancellation questions, lost business analysis."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to look back for cancellation date. Default 7.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_segment_mix",
            "description": (
                "Get market segment and channel mix for future business on the books. "
                "Returns room nights, revenue, and percentage share per segment. "
                "Use for OTA dependency, group share, corporate %, segment breakdown questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "stay_month": {
                        "type": "string",
                        "description": "Optional. Filter to a specific stay month in YYYY-MM format.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remember_preference",
            "description": (
                "Save a GM preference or custom threshold to persistent memory. "
                "Use when the GM says 'remember that...', 'always show...', "
                "'our target is...', or sets any preference for future sessions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["preference", "threshold"],
                        "description": "'preference' for output/format preferences, 'threshold' for numeric targets.",
                    },
                    "key": {
                        "type": "string",
                        "description": "Short label, e.g. 'output_format' or 'ota_target'.",
                    },
                    "value": {
                        "type": "string",
                        "description": "The value to store, e.g. 'bullet points' or '25%'.",
                    },
                },
                "required": ["type", "key", "value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_sql",
            "description": (
                "Execute a custom SQL query for questions not covered by the other tools. "
                "Use for room type ADR, company revenue, concentration analysis, or any ad-hoc question. "
                "Always follow the business rules: COUNT(DISTINCT reservation_id) for reservations, "
                "SUM(number_of_spaces) for room nights, exclude Cancelled by default."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The SQL query to execute against the hotel_hackathon database.",
                    }
                },
                "required": ["query"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(rows: list[dict]) -> list[dict]:
    """Convert Decimal to float so rows are JSON-serialisable."""
    out = []
    for row in rows:
        out.append({k: float(v) if isinstance(v, Decimal) else v for k, v in row.items()})
    return out


# ---------------------------------------------------------------------------
# Tool handlers — pre-validated SQL with correct business rules
# ---------------------------------------------------------------------------

def _get_otb_summary(months_ahead: int = 5) -> dict:
    rows = run_sql(
        """
        SELECT
            TO_CHAR(stay_date, 'YYYY-MM')                                        AS month,
            COUNT(DISTINCT reservation_id)                                        AS reservations,
            SUM(number_of_spaces)                                                AS room_nights,
            ROUND(SUM(daily_total_revenue_before_tax)::numeric, 0)               AS total_revenue,
            ROUND(
                (SUM(daily_room_revenue_before_tax) / NULLIF(SUM(number_of_spaces), 0))::numeric,
                2
            )                                                                     AS adr
        FROM reservations_hackathon
        WHERE reservation_status = 'Reserved'
          AND stay_date >= CURRENT_DATE
          AND stay_date < CURRENT_DATE + (%(months_ahead)s || ' months')::interval
        GROUP BY month
        ORDER BY month
        """,
        {"months_ahead": months_ahead},
    )
    totals = run_sql(
        """
        SELECT
            COUNT(DISTINCT reservation_id)                                        AS total_reservations,
            SUM(number_of_spaces)                                                AS total_room_nights,
            ROUND(SUM(daily_total_revenue_before_tax)::numeric, 0)               AS total_revenue,
            ROUND(
                (SUM(daily_room_revenue_before_tax) / NULLIF(SUM(number_of_spaces), 0))::numeric,
                2
            )                                                                     AS blended_adr
        FROM reservations_hackathon
        WHERE reservation_status = 'Reserved'
          AND stay_date >= CURRENT_DATE
          AND stay_date < CURRENT_DATE + (%(months_ahead)s || ' months')::interval
        """,
        {"months_ahead": months_ahead},
    )
    return {
        "by_month": _serialize(rows),
        "totals": _serialize(totals)[0],
    }


def _get_pickup(days: int = 7, stay_month: str = None) -> dict:
    base = """
        SELECT
            COUNT(DISTINCT reservation_id)                                        AS new_reservations,
            SUM(number_of_spaces)                                                AS room_nights_picked_up,
            ROUND(SUM(daily_total_revenue_before_tax)::numeric, 0)               AS revenue_picked_up,
            ROUND(AVG(lead_time)::numeric, 0)                                    AS avg_lead_time_days
        FROM reservations_hackathon
        WHERE reservation_status = 'Reserved'
          AND stay_date >= CURRENT_DATE
          AND create_datetime >= NOW() - (%(days)s || ' days')::interval
    """
    params = {"days": days}
    if stay_month:
        base += " AND TO_CHAR(stay_date, 'YYYY-MM') = %(stay_month)s"
        params["stay_month"] = stay_month

    summary = run_sql(base, params)

    # Breakdown by segment
    seg_query = """
        SELECT
            m.market_name,
            COUNT(DISTINCT r.reservation_id)                                      AS reservations,
            SUM(r.number_of_spaces)                                              AS room_nights
        FROM reservations_hackathon r
        JOIN market_code_lookup m ON r.market_code = m.market_code
        WHERE r.reservation_status = 'Reserved'
          AND r.stay_date >= CURRENT_DATE
          AND r.create_datetime >= NOW() - (%(days)s || ' days')::interval
    """
    seg_params = {"days": days}
    if stay_month:
        seg_query += " AND TO_CHAR(r.stay_date, 'YYYY-MM') = %(stay_month)s"
        seg_params["stay_month"] = stay_month
    seg_query += " GROUP BY m.market_name ORDER BY room_nights DESC"

    by_segment = run_sql(seg_query, seg_params)

    return {
        "period_days": days,
        "stay_month_filter": stay_month,
        "summary": _serialize(summary)[0],
        "by_segment": _serialize(by_segment),
    }


def _get_cancellations(days: int = 7) -> dict:
    summary = run_sql(
        """
        SELECT
            COUNT(DISTINCT reservation_id)                                        AS cancelled_reservations,
            SUM(number_of_spaces)                                                AS room_nights_lost,
            ROUND(SUM(daily_total_revenue_before_tax)::numeric, 0)               AS revenue_lost
        FROM reservations_hackathon
        WHERE reservation_status = 'Cancelled'
          AND cancellation_datetime >= NOW() - (%(days)s || ' days')::interval
        """,
        {"days": days},
    )
    by_stay_month = run_sql(
        """
        SELECT
            TO_CHAR(stay_date, 'YYYY-MM')                                        AS affected_stay_month,
            COUNT(DISTINCT reservation_id)                                        AS cancelled_reservations,
            SUM(number_of_spaces)                                                AS room_nights_lost,
            ROUND(SUM(daily_total_revenue_before_tax)::numeric, 0)               AS revenue_lost
        FROM reservations_hackathon
        WHERE reservation_status = 'Cancelled'
          AND cancellation_datetime >= NOW() - (%(days)s || ' days')::interval
        GROUP BY affected_stay_month
        ORDER BY affected_stay_month
        """,
        {"days": days},
    )
    return {
        "period_days": days,
        "summary": _serialize(summary)[0],
        "by_stay_month": _serialize(by_stay_month),
    }


def _get_segment_mix(stay_month: str = None) -> dict:
    base_where = "r.reservation_status = 'Reserved' AND r.stay_date >= CURRENT_DATE"
    params = {}
    if stay_month:
        base_where += " AND TO_CHAR(r.stay_date, 'YYYY-MM') = %(stay_month)s"
        params["stay_month"] = stay_month

    by_segment = run_sql(
        f"""
        SELECT
            m.market_name,
            m.macro_group,
            COUNT(DISTINCT r.reservation_id)                                      AS reservations,
            SUM(r.number_of_spaces)                                              AS room_nights,
            ROUND(SUM(r.daily_total_revenue_before_tax)::numeric, 0)             AS revenue,
            ROUND(
                SUM(r.number_of_spaces) * 100.0
                / NULLIF(SUM(SUM(r.number_of_spaces)) OVER (), 0),
                1
            )                                                                     AS pct_of_room_nights
        FROM reservations_hackathon r
        JOIN market_code_lookup m ON r.market_code = m.market_code
        WHERE {base_where}
        GROUP BY m.market_name, m.macro_group
        ORDER BY room_nights DESC
        """,
        params,
    )

    by_channel = run_sql(
        f"""
        SELECT
            c.channel_name,
            c.channel_group,
            SUM(r.number_of_spaces)                                              AS room_nights,
            ROUND(
                SUM(r.number_of_spaces) * 100.0
                / NULLIF(SUM(SUM(r.number_of_spaces)) OVER (), 0),
                1
            )                                                                     AS pct_of_room_nights
        FROM reservations_hackathon r
        JOIN channel_code_lookup c ON r.channel_code = c.channel_code
        WHERE {base_where}
        GROUP BY c.channel_name, c.channel_group
        ORDER BY room_nights DESC
        """,
        params,
    )

    ota_pct = run_sql(
        f"""
        SELECT
            ROUND(
                SUM(number_of_spaces) FILTER (WHERE market_code = 'OTA') * 100.0
                / NULLIF(SUM(number_of_spaces), 0),
                1
            ) AS ota_room_night_pct,
            ROUND(
                SUM(number_of_spaces) FILTER (WHERE is_block = true) * 100.0
                / NULLIF(SUM(number_of_spaces), 0),
                1
            ) AS group_block_pct
        FROM reservations_hackathon r
        WHERE {base_where}
        """,
        params,
    )

    return {
        "stay_month_filter": stay_month,
        "by_segment": _serialize(by_segment),
        "by_channel": _serialize(by_channel),
        "concentration": _serialize(ota_pct)[0],
    }


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

def handle_tool(name: str, arguments: dict) -> str:
    """Route tool calls to the correct handler. Returns JSON string."""
    try:
        if name == "get_otb_summary":
            result = _get_otb_summary(arguments.get("months_ahead", 5))
        elif name == "get_pickup":
            result = _get_pickup(
                days=arguments.get("days", 7),
                stay_month=arguments.get("stay_month"),
            )
        elif name == "get_cancellations":
            result = _get_cancellations(days=arguments.get("days", 7))
        elif name == "get_segment_mix":
            result = _get_segment_mix(stay_month=arguments.get("stay_month"))
        elif name == "remember_preference":
            if arguments.get("type") == "threshold":
                memory.set_threshold(arguments["key"], arguments["value"])
            else:
                memory.set_preference(arguments["key"], arguments["value"])
            result = {"saved": True, "key": arguments["key"], "value": arguments["value"]}
        elif name == "run_sql":
            rows = run_sql(arguments["query"])
            result = {"rows": _serialize(rows)}
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}

    return json.dumps(result)
