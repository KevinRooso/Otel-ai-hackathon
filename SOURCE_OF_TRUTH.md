# Revenue Manager Agent — Source of Truth
**Hackathon: Give(a)Go — 7 March 2026**
**Company: Otel AI | Roles: AI Engineer / Data Engineering**

---

## 1. Day Timeline

| Time | What |
|---|---|
| 11:45 | Build window opens |
| 13:00–13:45 | Lunch (build pauses) |
| 16:30 | Build stops, demos start |
| 16:30–17:00 | Demos — **3 min each, live only, no slides** |
| 17:00–17:15 | Prize winner selected per track |

**Effective build time: ~4 hours.** Scope ruthlessly. One thing done well beats three things half-done.

---

## 2. The Real Problem

The literal prompt: *build an agent that answers hotel revenue questions.*

The real problem: **a GM sits down every morning and needs to know what changed, what to worry about, and what to do — before they know what to ask.**

A weak submission builds a Q&A bot. A strong submission surfaces insight unprompted.

Judging criteria (verbatim):
> - Solve a real part of the problem, not just the literal prompt
> - Use AI in a way that adds genuine value
> - Prioritise well under time pressure
> - Ship something functional
> - Communicate clearly in the demo

---

## 3. What We Are Building

**A Revenue Manager Agent for a Hotel GM** with two modes:

**1. Morning Briefing (proactive, runs on load)**
Auto-scans the data and surfaces — without being asked:
- Revenue on the books for next 30 / 60 / 90 days
- What changed in the last 7 days (new bookings + cancellations)
- Concentration risks (OTA dependency, group reliance)
- The #1 thing the GM should act on today

**2. Conversational Q&A (GM asks follow-ups)**
GM types a plain-English question and gets back:
1. The key number
2. What's driving it
3. The risk or opportunity
4. One clear recommended action

---

## 4. Memory Strategy

### Two types — both used, different purposes

#### Type 1: Conversation Memory (within a session) — Essential
Passes the `messages` array between chat turns. Without this, every GM question is stateless — follow-up questions like "what about the OTA mix there?" have no context.

**Implementation:** Frontend maintains `messages[]` and sends it with every `/chat` request. Backend passes it directly into the OpenRouter call. Zero extra infrastructure.

#### Type 2: Persistent Memory (across sessions) — Lightweight, targeted
A JSON file store that survives between browser sessions. **Critical rule: never store revenue data or query results** — those must always come from the live database. Only store GM preferences and custom thresholds.

**What gets stored:**
- GM preferences: `"always show data by room type"`, `"prefer bullet-point format"`
- Custom thresholds: `"ota_target: 25%"`, `"flag cancellations above 5 room nights"`
- Session handoff: `"last session flagged June cancellations as key risk"`

**The demo moment this enables:** GM opens the app in a new session. Briefing runs. Because memory has `ota_target: 25%` and OTA is at 19.2%, the agent says *"OTA is at 19.2% — within your stated target of 25%."* That's a system that learns the GM's context, not a stateless Q&A bot.

**Implementation:** `memory.py` — simple JSON file store with `set_preference()`, `log_session()`, `get_context()`. One extra tool: `remember_preference`. GM says *"remember our OTA target is 25%"* — stored, injected into every future system prompt.

### What memory never stores
- Revenue figures, room nights, ADR — always live from DB
- Query results of any kind — data changes, memory goes stale
- SQL queries or analysis outputs

### Files added
```
backend/
├── memory.py     ← MemoryStore: JSON file, preferences + thresholds + session log
├── agent.py      ← updated: accepts messages history + injects memory context
└── api.py        ← updated: /chat accepts messages[], GET /memory, DELETE /memory
```

---

## 6. What We Are Not Building

- A raw SQL query tool
- A generic chatbot
- A complex multi-agent pipeline
- Anything that requires the GM to know hotel jargon

---

## 7. How We Use Skills (SKILL.md Pattern)

### Two things called "skills" — important distinction

**SKILL.md files** are the domain playbooks. They define when to activate, what process to follow, which business rules matter, and how the answer should sound.

**Tools in `tools.py`** are live data access. They fetch structured numbers from the database. They are not skills.

### Why we use SKILL.md but not native Claude Code plugin discovery

Native Claude Code/project discovery expects skills to live in a standard Claude directory structure and slash commands to be defined separately in a `commands/` directory. That is ideal when Claude Code itself is the runtime, but this app runs as a custom FastAPI backend serving a frontend and calling Claude through OpenRouter.

So this project uses the **SKILL.md content pattern** rather than native Claude Code plugin loading. We still write proper SKILL.md files, but `agent.py` loads them into the system prompt at runtime. That keeps the domain rules modular and recognizable without pretending this repo is a full Claude Code plugin.

### Our SKILL.md files

```
backend/.claude/skills/
├── concentration-risk/
│   └── SKILL.md    ← OTA dependency, segment diversification, risk thresholds
├── morning-briefing/
│   └── SKILL.md    ← briefing structure, what to surface, output format
├── prediction-guidance/
│   └── SKILL.md    ← directional estimates, date assumptions, fact vs inference
├── response-presentation/
│   └── SKILL.md    ← HTML formatting, semantic classes, output polish
└── revenue-analysis/
    └── SKILL.md    ← metric definitions, SQL rules, grain rules, guardrails
```

**`revenue-analysis/SKILL.md`** handles the hotel math: table grain, canonical metric definitions, cancellation defaults, date-field rules, and tool-picking guidance.

**`morning-briefing/SKILL.md`** handles the briefing behavior: when to run, which tools to call, how to structure the answer, and how to land on one clear action.

**`concentration-risk/SKILL.md`** handles OTA dependency analysis, segment diversification, and risk thresholds. Triggered when the GM asks about OTA reliance or concentration.

**`prediction-guidance/SKILL.md`** handles questions about future performance, relative dates, and expected outcomes. Ensures the agent distinguishes observed data from directional estimates.

**`response-presentation/SKILL.md`** defines the HTML formatting conventions, semantic CSS classes (`otel-response*`, `otel-metric-card*`), and output polish rules.

### How agent.py loads them

```python
from pathlib import Path

def _load_skills() -> str:
    skills_dir = Path(__file__).parent / ".claude" / "skills"
    parts = []
    for skill_file in sorted(skills_dir.glob("*/SKILL.md")):
        parts.append(skill_file.read_text(encoding="utf-8"))
    return "\n\n---\n\n".join(parts)

SKILL_CONTEXT = _load_skills()  # loaded once at import time
```

All 5 SKILL.md files are loaded at startup and injected into the system prompt. `_build_system_prompt(active_skill)` then appends skill-specific instructions and GM memory context for each request.

---

## 8. Architecture

```
┌──────────────────────────────────────────────────────┐
│             REACT FRONTEND (Vite)                    │
│                                                      │
│  Chat-focused layout: ChatLayout + InsightsSidebar   │
│  WelcomeScreen with API key + suggested questions    │
│  MessageBubble with HTML rendering + Markdown        │
│  InsightsSidebar: KPI cards, charts, tables          │
│  SSE streaming via /chat/stream endpoint             │
└───────────────────────┬──────────────────────────────┘
                        │ HTTP / JSON / SSE
                        │
┌───────────────────────▼──────────────────────────────┐
│             FASTAPI BACKEND (api.py)                 │
│                                                      │
│  POST /briefing      → morning or greeting briefing  │
│  POST /chat          → GM question answer            │
│  POST /chat/stream   → SSE streamed GM answer        │
│  GET  /health        → liveness check                │
│  GET/DELETE /memory   → view/reset session memory    │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│             AGENT CORE (agent.py)                    │
│                                                      │
│  Model: anthropic/claude-sonnet-4-6 (default)        │
│  SDK: openai → OpenRouter (user's API key)           │
│  System prompt: loaded from 5 SKILL.md files         │
│                                                      │
│  Flow: question → lightweight skill routing          │
│        → Morning Briefing / Greeting / Concentration │
│          Risk / Prediction Guidance / Revenue        │
│        → Claude selects tools                        │
│        → HTML normalization → final answer           │
└──────────┬────────────────────────────┬──────────────┘
           │                            │
┌──────────▼──────────┐   ┌─────────────▼─────────────┐
│   tools.py (9)      │   │   db.py                   │
│                     │   │                           │
│   get_otb_summary   │   │   ThreadedConnectionPool  │
│   get_pickup        │   │   (2-10 connections)      │
│   get_cancellations │   │   run_sql(query) → rows   │
│   get_segment_mix   │   │                           │
│   get_room_type     │   └───────────────────────────┘
│   get_company       │
│   get_conc_risk     │
│   remember_pref     │
│   run_sql (escape)  │
└──────────┬──────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│   POSTGRESQL 16 (Docker)                            │
│   host: localhost:5433                              │
│   db: hotel_hackathon  user/pass: hackathon         │
└─────────────────────────────────────────────────────┘
```

---

## 9. Stack

| Layer | Technology | Why |
|---|---|---|
| Backend language | Python 3.12 | Best agent ecosystem |
| LLM gateway | OpenRouter (OpenAI-compatible API) | User brings their own key — no demo-day cost; model flexibility |
| AI SDK | `openai` (pointed at OpenRouter base URL) | OpenRouter is OpenAI-compatible; tool-calling works natively |
| Default model | `anthropic/claude-sonnet-4-6` via OpenRouter | Same model, user can override to any OpenRouter model |
| DB driver | `psycopg2-binary` with `ThreadedConnectionPool` | Connection pooling (2-10), lazy init |
| SSE streaming | `sse-starlette` | Word-by-word streaming for chat responses |
| Backend API | FastAPI + uvicorn | Async, minimal boilerplate, auto-docs |
| Frontend | React 19 + Vite 7 | Fast scaffold, component-based, looks real in demo |
| Frontend libs | framer-motion, lucide-react, recharts, react-markdown | Animations, icons, charts, markdown rendering |
| UI design | Chat-focused layout with insights sidebar | Conversational UX with contextual data panels |

### Frontend implementation notes

- The frontend uses a **chat-focused layout** (`ChatLayout.jsx`) with an `InsightsSidebar` that surfaces KPI cards, charts, and tables contextually as the conversation progresses.
- `WelcomeScreen.jsx` handles the initial state: API key entry, backend health status, and suggested starter questions.
- Chat messages render HTML responses via `MessageBubble.jsx` (agent HTML output) and `react-markdown` for plain text fallback.
- `insightExtractor.js` parses structured tool call results from the conversation `history` array to populate the sidebar's KPI cards, revenue chart (`ArtifactChart.jsx` via Recharts), and data tables (`ArtifactTable.jsx`).
- `suggestedQuestions.js` provides contextual follow-up question prompts that adapt to the current conversation state.
- `useAutoScroll.js` hook handles automatic chat scroll behavior.
- The live frontend experience is grounded in real backend contracts: `GET /health`, `POST /briefing`, `POST /chat`, `POST /chat/stream` (SSE), `GET /memory`, and `DELETE /memory`.

### OpenRouter setup

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=user_api_key,  # from UI input or .env fallback
)
```

### Tool format — OpenAI function-calling (not Anthropic format)

```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_otb_summary",
            "description": "Revenue on the books by month for future stays. Excludes cancelled reservations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "months_ahead": {"type": "integer", "description": "Months ahead to include. Default 3."}
                }
            }
        }
    },
    # ... same pattern for get_pickup, get_cancellations, get_segment_mix, run_sql
]
```

### Agent loop — OpenAI format

```python
# Tool call detection
if response.choices[0].finish_reason == "tool_calls":
    for tc in response.choices[0].message.tool_calls:
        result = handle_tool(tc.function.name, json.loads(tc.function.arguments), conn)
        messages.append({
            "role": "tool",
            "tool_call_id": tc.id,
            "content": json.dumps(result)
        })
```

### API key flow

- **UI** has an API key input field — user pastes their OpenRouter key
- **FastAPI** accepts `api_key` in the request body, uses it for that session
- **Fallback** — `OPENROUTER_API_KEY` in `.env` (for local dev / your own testing)
- **`/health`** endpoint validates the key before the briefing runs — catches bad keys before the demo breaks live

### backend/requirements.txt
```
openai
psycopg2-binary
fastapi
uvicorn
python-dotenv
sse-starlette
```

### frontend bootstrap
```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install framer-motion lucide-react react-markdown recharts remark-gfm
```

---

## 10. File Structure

```
hiring_hackathon/
├── SOURCE_OF_TRUTH.md
├── .gitignore
├── otel-hackathon/              ← cloned repo, do not modify (gitignored)
│   ├── docker-compose.yml
│   ├── schema.sql
│   └── seed.sql
├── backend/
│   ├── .claude/
│   │   └── skills/
│   │       ├── concentration-risk/
│   │       │   └── SKILL.md     ← OTA dependency, diversification, risk thresholds
│   │       ├── morning-briefing/
│   │       │   └── SKILL.md     ← briefing process, format, output rules
│   │       ├── prediction-guidance/
│   │       │   └── SKILL.md     ← directional estimates, date assumptions
│   │       ├── response-presentation/
│   │       │   └── SKILL.md     ← HTML formatting, semantic classes
│   │       └── revenue-analysis/
│   │           └── SKILL.md     ← domain rules, metric definitions, guardrails
│   ├── .env                     ← OPENROUTER_API_KEY + DB_URL (gitignored)
│   ├── requirements.txt
│   ├── memory.json              ← persistent memory store (auto-generated)
│   ├── db.py                    ← ThreadedConnectionPool (2-10) + run_sql()
│   ├── memory.py                ← MemoryStore: preferences, thresholds, session log (JSON)
│   ├── tools.py                 ← 9 OpenAI-format tool defs + handlers with pre-validated SQL
│   ├── agent.py                 ← 5 SKILL.md → system prompt + memory context → tool-use loop
│   └── api.py                   ← FastAPI: /briefing /chat /chat/stream /health /memory
└── frontend/
    ├── package.json
    ├── package-lock.json
    └── src/
        ├── main.jsx
        ├── App.jsx              ← main app shell, state management
        ├── index.css            ← theme + layout system
        ├── api/
        │   └── client.js        ← fetch helpers for all 6 endpoints
        ├── hooks/
        │   └── useAutoScroll.js ← chat auto-scroll behavior
        ├── utils/
        │   ├── formatters.js    ← money/percent/date formatting
        │   ├── insightExtractor.js ← parse tool call results → KPI data
        │   └── suggestedQuestions.js ← contextual follow-up prompts
        └── components/
            ├── ChatLayout.jsx   ← main two-panel layout (chat + sidebar)
            ├── WelcomeScreen.jsx ← API key entry, health status, starter questions
            ├── chat/
            │   ├── ChatPanel.jsx       ← message list + input area
            │   ├── ChatInput.jsx       ← text input + send button
            │   ├── MessageBubble.jsx   ← HTML/markdown message rendering
            │   ├── SuggestedQuestions.jsx ← follow-up question chips
            │   └── TypingIndicator.jsx ← streaming indicator
            └── sidebar/
                ├── InsightsSidebar.jsx ← collapsible insights panel
                ├── InsightCard.jsx     ← KPI metric cards
                ├── ArtifactChart.jsx   ← Recharts revenue visualization
                ├── ArtifactTable.jsx   ← data tables from tool output
                └── SidebarSection.jsx  ← collapsible section wrapper
```

---

## 11. Data Retrieval Strategy — Native Tool-Calling

### Why not text-to-SQL

Most teams will prompt Claude to generate SQL and run it. That is fragile:
- it can make the grain mistake and count rows as reservations
- it can hallucinate columns or joins
- it can answer the same question differently across runs

### Why not a heavy custom routing layer

A separate classifier for every possible intent adds another failure point. We only add lightweight routing for the few flows that materially change behavior, then let Claude handle tool selection inside that path.

### What we do route explicitly

`agent.py` classifies each user message into one of five skill routes:
- **Morning Briefing** — overview-style prompts where the briefing workflow should be emphasized
- **Greeting Briefing** — warm, conversational opening (~200 words) with all 5 tools, no formal headers
- **Concentration Risk** — OTA dependency, segment diversification, concentration analysis
- **Prediction Guidance** — future performance questions, directional estimates with clear date assumptions
- **Revenue Analysis** (default) — normal GM questions where the smallest relevant tool set should be used

Classification uses keyword matching in `_classify_skill()` — lightweight and deterministic. The `/briefing` endpoint also supports `mode: "greeting"` for a conversational variant.

Additionally, agent responses are normalized to semantic HTML via `_normalize_final_response()` which wraps plain-text responses in `otel-response*` classes for consistent frontend rendering.

### What we use: OpenAI-format tool-calling via OpenRouter

The backend uses the `openai` SDK against OpenRouter, so tools are defined in OpenAI chat-completions function format. The skills provide the decision rules and output style. The tools provide structured live data. Tool handlers bake in the business logic so Claude reasons over safe, consistent results instead of composing raw SQL every time.

### The tools (defined in `tools.py`)

| Tool | Description Claude sees | Pre-validated SQL returns |
|---|---|---|
| `get_otb_summary` | Revenue on the books by month for future stays | `{by_month, totals}` |
| `get_pickup` | New reservations booked in last N days for future stays | `{summary, by_segment}` |
| `get_cancellations` | Cancellations in last N days and affected stay months | `{summary, by_stay_month}` |
| `get_segment_mix` | Market segment and channel mix for future business | `{by_segment, by_channel, concentration}` |
| `get_room_type_analysis` | ADR, room nights, and revenue by room type | `{by_room_type}` |
| `get_company_analysis` | Revenue and room nights by company | `{companies}` |
| `get_concentration_risk` | Dependency and concentration summary | `{ota_pct, group_block_pct, top_segment, top_company}` |
| `remember_preference` | Persist GM preferences and thresholds across sessions | `{saved, key, value}` |
| `run_sql` | Escape hatch for questions none of the above cover | `{rows}` |

### Tool definition shape (OpenAI chat-completions format)
```python
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_otb_summary",
            "description": "Get revenue on the books by month for future stay dates. Returns room nights, total revenue, and ADR per month. Excludes cancelled reservations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "months_ahead": {
                        "type": "integer",
                        "description": "How many months ahead to include. Default 5."
                    }
                }
            }
        }
    },
    # ... same pattern for the remaining tools
]
```

### Tool handler shape (`tools.py`)
```python
def handle_tool(name: str, arguments: dict) -> str:
    if name == "get_otb_summary":
        result = _get_otb_summary(arguments.get("months_ahead", 5))
    elif name == "get_pickup":
        result = _get_pickup(
            days=arguments.get("days", 7),
            stay_month=arguments.get("stay_month"),
        )
    # ...
    return json.dumps(result)

def _get_otb_summary(months_ahead: int = 5) -> dict:
    # Pre-validated SQL using correct metric definitions
    # COUNT(DISTINCT reservation_id), SUM(number_of_spaces), correct ADR formula
    # Returns structured dict which is then JSON-encoded for the tool response
    ...
```

### Natural language stay_month parsing

Tools that accept a `stay_month` parameter (get_pickup, get_cancellations) use `_normalize_stay_month()` which handles multiple input formats:
- ISO format: `"2026-07"`
- Full name: `"July 2026"`, `"July"`
- Abbreviation: `"Jul"`, `"Jul 2026"`

This is implemented via `MONTH_NAME_TO_NUMBER` dict and regex parsing in `tools.py`.

### Morning briefing pattern

The morning briefing asks Claude for a complete snapshot in one pass:

```
Prompt: "Run morning briefing"

Claude response → [
    tool_call: get_otb_summary(months_ahead=5),
    tool_call: get_pickup(days=7),
    tool_call: get_cancellations(days=7),
    tool_call: get_segment_mix(),
    tool_call: get_concentration_risk()
]

All 5 are requested in one model turn → structured results fed back to Claude
→ Claude synthesises into one GM briefing with the #1 action
```

That keeps the briefing grounded in live data and still gives the GM one clear recommendation.

### Agent tool loop (`agent.py`)
```python
def _run_tool_loop(client: OpenAI, messages: list, system_prompt: str) -> str:
    """Run the OpenAI tool-use loop until end_turn. Returns final text."""
    while True:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": system_prompt}] + messages,
            tools=TOOLS,
            max_tokens=4096,
        )

        choice = response.choices[0]
        if choice.finish_reason == "tool_calls":
            # Append assistant turn with tool_calls, then execute each tool
            for tc in choice.message.tool_calls:
                result = handle_tool(tc.function.name, json.loads(tc.function.arguments))
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
        else:
            return _normalize_final_response(choice.message.content or "")
```

---

## 12. The Data

**Connection:** `postgresql://hackathon:hackathon@localhost:5433/hotel_hackathon`

### Table grain — the most important thing

`reservations_hackathon` is **one row per reservation × stay_date**.

- A 3-night stay = 3 rows, same `reservation_id`
- Counting rows ≠ counting reservations
- Room nights = `SUM(number_of_spaces)` not `COUNT(*)`

### Tables

| Table | Rows | Purpose |
|---|---|---|
| `reservations_hackathon` | 455 | Main fact table |
| `room_type_lookup` | 3 | space_type → display name, class |
| `market_code_lookup` | 10 | market_code → segment name, macro group |
| `channel_code_lookup` | 4 | channel_code → channel name, group |

### Key columns

| Column | Use for |
|---|---|
| `reservation_id` | Unique reservation identity — always DISTINCT |
| `stay_date` | Revenue position, OTB (which night is occupied) |
| `create_datetime` | Pickup, booking pace, "what changed recently" |
| `cancellation_datetime` | When a reservation was cancelled |
| `reservation_status` | `Reserved` or `Cancelled` — exclude Cancelled by default |
| `number_of_spaces` | Rooms on this row — SUM for room nights |
| `daily_total_revenue_before_tax` | Total revenue per stay-date row (default) |
| `daily_room_revenue_before_tax` | Room-only revenue (use when question is specifically about rooms) |
| `adr_room` | Reservation-level ADR (pre-calculated, for reference) |
| `market_code` | Segment mix — join to market_code_lookup |
| `channel_code` | Channel mix — join to channel_code_lookup |
| `is_block` | Group block vs transient |
| `lead_time` | Days between booking and arrival |

### Market codes
- `OTA` — Online Travel Agency (Booking.com, Expedia) — risk if >40% of room nights
- `BAR` — Best Available Rate, direct transient
- `FIT` — Free Independent Traveller
- `CSR` / `CNR` — Corporate
- `CNI` / `CGR` / `SMERF` — Group business

---

## 13. Business Metric Definitions

These are canonical. Every skill and every freeform SQL query must use these.

### Reservation count
```sql
COUNT(DISTINCT reservation_id)
-- WHERE reservation_status = 'Reserved'  (unless question is about cancellations)
```

### Room nights
```sql
SUM(number_of_spaces)
-- WHERE reservation_status = 'Reserved'  (unless question is about cancellations)
```

### Revenue (default)
```sql
SUM(daily_total_revenue_before_tax)
-- Use daily_room_revenue_before_tax only when question is specifically about room revenue
```

### ADR
```sql
SUM(daily_room_revenue_before_tax) / NULLIF(SUM(number_of_spaces), 0)
-- NOT AVG(adr_room) — that is unweighted by room night
```

### On the Books (OTB)
```sql
WHERE reservation_status = 'Reserved'
  AND stay_date >= CURRENT_DATE
```

### Pickup (last N days)
```sql
WHERE reservation_status = 'Reserved'
  AND stay_date >= CURRENT_DATE
  AND create_datetime >= NOW() - INTERVAL 'N days'
```

### Cancellations (period)
```sql
WHERE reservation_status = 'Cancelled'
  AND cancellation_datetime BETWEEN :start AND :end
```

### OTA dependency
```sql
SUM(number_of_spaces) FILTER (WHERE market_code = 'OTA') * 100.0
  / NULLIF(SUM(number_of_spaces), 0)
-- Flag if > 40%
```

---

## 14. Response Format

Every answer from the agent must follow this structure:

```
HEADLINE — one sentence with the key number

CONTEXT — 2–3 sentences on what's driving it and what's notable

RISK or OPPORTUNITY — one sentence

RECOMMENDATION — one clear action
```

Example:
> **You have 87 room nights on the books in July at an ADR of €182.**
>
> OTA accounts for 61% of that — primarily Booking.com — above the healthy threshold of 40%. Corporate pickup has been flat for 14 days with no new bookings since 20 Feb.
>
> Risk: OTA-heavy July leaves you exposed to last-minute rate pressure with limited margin protection.
>
> Recommendation: Launch a direct-book rate for July this week to shift mix and protect ADR.

---

## 15. Build Order

### Phase 1 — Backend (build and test fully before touching frontend)

1. `db.py` — postgres connection pooling, `run_sql()` function, verify data ✅ done
2. `revenue-analysis/SKILL.md` — metric definitions, grain rules, guardrails ✅ done
3. `morning-briefing/SKILL.md` — briefing process, parallel tools, output format ✅ done
4. `concentration-risk/SKILL.md` — OTA dependency, diversification, risk thresholds ✅ done
5. `prediction-guidance/SKILL.md` — directional estimates, date assumptions ✅ done
6. `response-presentation/SKILL.md` — HTML formatting, semantic classes ✅ done
7. `tools.py` — 9 OpenAI-format tool defs + pre-validated SQL handlers ✅ done
8. `memory.py` — MemoryStore: preferences, thresholds, session log ✅ done
9. `agent.py` — 5 SKILL.md + memory → system prompt → 5-route skill classification → tool-use loop ✅ done
10. `api.py` — FastAPI: /briefing /chat /chat/stream /health /memory endpoints ✅ done
11. Test all 10 README example questions via terminal / curl ✅ done (Playwright)

### Phase 2 — Frontend (only after backend is solid)

12. Scaffold with Vite React ✅ done
13. Implement chat-focused layout: `ChatLayout.jsx` + `InsightsSidebar` ✅ done
14. `WelcomeScreen.jsx` — API key entry, backend health, starter questions ✅ done
15. `ChatPanel.jsx` + `MessageBubble.jsx` — chat UI with HTML rendering ✅ done
16. `InsightCard.jsx` + `ArtifactChart.jsx` + `ArtifactTable.jsx` — parsed tool output visualization ✅ done
17. `insightExtractor.js` + `suggestedQuestions.js` — data extraction + follow-up prompts ✅ done

### Phase 3 — Polish

18. End-to-end smoke test with Playwright ✅ done
19. Run the 3-minute demo script once before presenting

---

## 16. Demo Script (3 minutes, live, no slides)

**0:00–1:00** — Open the app. Morning briefing auto-runs. Walk through the "act on today" recommendation. Show that the GM got insight without asking anything.

**1:00–2:00** — GM asks two questions live:
- "What changed in the last 7 days?"
- "Are we too dependent on OTA?"

Show correct numbers, commercial language, recommendation at the end of each.

**2:00–3:00** — One design decision to explain:
> "We didn't build a Q&A bot. We built something that tells you what matters before you ask. And the skills layer means it gets the hotel math right — correct grain, correct ADR, correct exclusion of cancelled bookings — every time."

---

*Last updated: 7 March 2026*
