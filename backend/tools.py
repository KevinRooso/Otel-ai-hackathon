import json
import re
from decimal import Decimal
from db import run_sql
from memory import memory

MONTH_NAME_TO_NUMBER = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

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
    {
        "type": "function",
        "function": {
            "name": "get_room_type_analysis",
            "description": (
                "ADR, room nights, and revenue breakdown by room type for future on-the-books business. "
                "Use for room type comparisons, ADR by room type, room mix questions."
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
            "name": "get_company_analysis",
            "description": (
                "Revenue and room night contribution by company/corporate account. "
                "Use for company revenue, corporate concentration, key account questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "stay_month": {
                        "type": "string",
                        "description": "Optional. Filter to a specific stay month in YYYY-MM format.",
                    },
                    "min_revenue": {
                        "type": "number",
                        "description": "Optional. Minimum revenue threshold to include a company.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_concentration_risk",
            "description": (
                "Business concentration metrics and risk assessment in one call. "
                "Returns OTA % of room nights, top segment name and %, top company name and revenue %, "
                "and group block % of room nights. Use for risk, dependency, concentration questions."
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


def _normalize_stay_month(stay_month: str | None) -> str | None:
    if stay_month is None:
        return None

    value = stay_month.strip()
    if not value:
        return None

    iso_match = re.fullmatch(r"(\d{4})-(\d{1,2})", value)
    if iso_match:
        year = int(iso_match.group(1))
        month = int(iso_match.group(2))
        if 1 <= month <= 12:
            return f"{year:04d}-{month:02d}"
        raise ValueError("Invalid stay_month. Expected month between 1 and 12.")

    month_year_match = re.fullmatch(r"([A-Za-z]+)\s+(\d{4})", value)
    if month_year_match:
        month_name = month_year_match.group(1).lower()
        year = int(month_year_match.group(2))
        month = MONTH_NAME_TO_NUMBER.get(month_name)
        if month:
            return f"{year:04d}-{month:02d}"
        raise ValueError("Invalid stay_month. Use YYYY-MM or a month name like 'July 2026'.")

    month_only_match = re.fullmatch(r"[A-Za-z]+", value)
    if month_only_match:
        month = MONTH_NAME_TO_NUMBER.get(value.lower())
        if not month:
            raise ValueError("Invalid stay_month. Use YYYY-MM or a month name like 'July'.")

        rows = run_sql(
            """
            SELECT TO_CHAR(MIN(stay_date), 'YYYY') AS year
            FROM reservations_hackathon
            WHERE EXTRACT(MONTH FROM stay_date) = %(month)s
            """,
            {"month": month},
        )
        year = rows[0]["year"] if rows and rows[0].get("year") else None
        if not year:
            raise ValueError(f"No data exists for month '{value}'.")
        return f"{int(year):04d}-{month:02d}"

    raise ValueError("Invalid stay_month. Use YYYY-MM or a month name like 'July 2026'.")


def _validate_sql(query: str) -> str | None:
    """Return an error message if the query is not a safe SELECT, else None."""
    normalized = query.strip().upper()
    if not normalized.startswith("SELECT"):
        return "Only SELECT queries are allowed for safety."
    forbidden = {"DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE", "GRANT", "REVOKE"}
    tokens = set(re.findall(r"[A-Z_]+", normalized))
    if tokens & forbidden:
        return "Only SELECT queries are allowed for safety."
    return None


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


def _get_pickup(days: int = 7, stay_month: str | None = None) -> dict:
    stay_month = _normalize_stay_month(stay_month)
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
    params: dict[str, object] = {"days": days}
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
    seg_params: dict[str, object] = {"days": days}
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


def _get_segment_mix(stay_month: str | None = None) -> dict:
    stay_month = _normalize_stay_month(stay_month)
    base_where = "r.reservation_status = 'Reserved' AND r.stay_date >= CURRENT_DATE"
    params: dict[str, object] = {}
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


def _get_room_type_analysis(stay_month: str | None = None) -> dict:
    stay_month = _normalize_stay_month(stay_month)
    base_where = "r.reservation_status = 'Reserved' AND r.stay_date >= CURRENT_DATE"
    params: dict[str, object] = {}
    if stay_month:
        base_where += " AND TO_CHAR(r.stay_date, 'YYYY-MM') = %(stay_month)s"
        params["stay_month"] = stay_month

    rows = run_sql(
        f"""
        SELECT
            rt.display_name,
            rt.room_class,
            rt.number_of_rooms                                                    AS inventory,
            COUNT(DISTINCT r.reservation_id)                                      AS reservations,
            SUM(r.number_of_spaces)                                              AS room_nights,
            ROUND(SUM(r.daily_total_revenue_before_tax)::numeric, 0)             AS total_revenue,
            ROUND(
                (SUM(r.daily_room_revenue_before_tax) / NULLIF(SUM(r.number_of_spaces), 0))::numeric,
                2
            )                                                                     AS adr
        FROM reservations_hackathon r
        JOIN room_type_lookup rt ON r.space_type = rt.space_type
        WHERE {base_where}
        GROUP BY rt.display_name, rt.room_class, rt.number_of_rooms
        ORDER BY adr DESC
        """,
        params,
    )
    return {
        "stay_month_filter": stay_month,
        "by_room_type": _serialize(rows),
    }


def _get_company_analysis(stay_month: str | None = None, min_revenue: float | None = None) -> dict:
    stay_month = _normalize_stay_month(stay_month)
    base_where = (
        "reservation_status = 'Reserved' AND stay_date >= CURRENT_DATE "
        "AND company_name IS NOT NULL"
    )
    params: dict[str, object] = {}
    if stay_month:
        base_where += " AND TO_CHAR(stay_date, 'YYYY-MM') = %(stay_month)s"
        params["stay_month"] = stay_month

    rows = run_sql(
        f"""
        SELECT
            company_name,
            COUNT(DISTINCT reservation_id)                                        AS reservations,
            SUM(number_of_spaces)                                                AS room_nights,
            ROUND(SUM(daily_total_revenue_before_tax)::numeric, 0)               AS revenue,
            ROUND(
                (SUM(daily_room_revenue_before_tax) / NULLIF(SUM(number_of_spaces), 0))::numeric,
                2
            )                                                                     AS adr
        FROM reservations_hackathon
        WHERE {base_where}
        GROUP BY company_name
        ORDER BY revenue DESC
        """,
        params,
    )
    result = _serialize(rows)
    if min_revenue is not None:
        result = [r for r in result if r["revenue"] >= min_revenue]
    return {"stay_month_filter": stay_month, "companies": result}


def _get_concentration_risk(stay_month: str | None = None) -> dict:
    stay_month = _normalize_stay_month(stay_month)
    base_where = "reservation_status = 'Reserved' AND stay_date >= CURRENT_DATE"
    params: dict[str, object] = {}
    if stay_month:
        base_where += " AND TO_CHAR(stay_date, 'YYYY-MM') = %(stay_month)s"
        params["stay_month"] = stay_month

    # OTA and group block percentages
    pct_rows = run_sql(
        f"""
        SELECT
            ROUND(
                SUM(number_of_spaces) FILTER (WHERE market_code = 'OTA') * 100.0
                / NULLIF(SUM(number_of_spaces), 0), 1
            ) AS ota_pct,
            ROUND(
                SUM(number_of_spaces) FILTER (WHERE is_block = true) * 100.0
                / NULLIF(SUM(number_of_spaces), 0), 1
            ) AS group_block_pct
        FROM reservations_hackathon
        WHERE {base_where}
        """,
        params,
    )

    # Top segment by room nights
    top_segment = run_sql(
        f"""
        SELECT
            m.market_name,
            ROUND(
                SUM(r.number_of_spaces) * 100.0
                / NULLIF((SELECT SUM(number_of_spaces) FROM reservations_hackathon WHERE {base_where}), 0),
                1
            ) AS pct_of_room_nights
        FROM reservations_hackathon r
        JOIN market_code_lookup m ON r.market_code = m.market_code
        WHERE {base_where.replace('reservation_status', 'r.reservation_status').replace('stay_date', 'r.stay_date').replace('number_of_spaces', 'r.number_of_spaces').replace('market_code', 'r.market_code').replace('is_block', 'r.is_block')}
        GROUP BY m.market_name
        ORDER BY SUM(r.number_of_spaces) DESC
        LIMIT 1
        """,
        params,
    )

    # Top company by revenue
    top_company = run_sql(
        f"""
        SELECT
            company_name,
            ROUND(
                SUM(daily_total_revenue_before_tax) * 100.0
                / NULLIF((SELECT SUM(daily_total_revenue_before_tax) FROM reservations_hackathon WHERE {base_where}), 0),
                1
            ) AS pct_of_revenue
        FROM reservations_hackathon
        WHERE {base_where} AND company_name IS NOT NULL
        GROUP BY company_name
        ORDER BY SUM(daily_total_revenue_before_tax) DESC
        LIMIT 1
        """,
        params,
    )

    concentration = _serialize(pct_rows)[0]
    concentration["top_segment"] = _serialize(top_segment)[0] if top_segment else None
    concentration["top_company"] = _serialize(top_company)[0] if top_company else None
    concentration["stay_month_filter"] = stay_month

    return concentration


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
        elif name == "get_room_type_analysis":
            result = _get_room_type_analysis(stay_month=arguments.get("stay_month"))
        elif name == "get_company_analysis":
            result = _get_company_analysis(
                stay_month=arguments.get("stay_month"),
                min_revenue=arguments.get("min_revenue"),
            )
        elif name == "get_concentration_risk":
            result = _get_concentration_risk(stay_month=arguments.get("stay_month"))
        elif name == "remember_preference":
            if arguments.get("type") == "threshold":
                memory.set_threshold(arguments["key"], arguments["value"])
            else:
                memory.set_preference(arguments["key"], arguments["value"])
            result = {"saved": True, "key": arguments["key"], "value": arguments["value"]}
        elif name == "run_sql":
            error = _validate_sql(arguments["query"])
            if error:
                result = {"error": error}
            else:
                rows = run_sql(arguments["query"])
                result = {"rows": _serialize(rows)}
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception:
        result = {"error": f"Tool '{name}' encountered an issue. Try rephrasing your question or using a simpler approach."}

    return json.dumps(result)
