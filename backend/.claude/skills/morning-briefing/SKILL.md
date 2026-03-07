# Morning Briefing Skill

## When to Activate
Activate on app startup (automatic) or when the GM asks for:
- "morning briefing", "daily briefing", "what should I know today"
- "give me an overview", "what's the situation"

## Process
Run all four tools in a single turn (parallel):
1. `get_otb_summary(months_ahead=5)` — full revenue position
2. `get_pickup(days=7)` — what changed in the last week
3. `get_cancellations(days=7)` — recent cancellations
4. `get_segment_mix()` — current business mix

Then synthesise into a single structured briefing.

## Output Format

Use exactly these markdown section headers. The UI parses them to render structured cards.

```
## On the Books
[2-3 sentences: total room nights, revenue, ADR. Call out the dominant month with its numbers.]

## Last 7 Days — Pickup
[2 sentences: room nights + revenue picked up, which segments drove it, average lead time.]

## Last 7 Days — Cancellations
[1-2 sentences: cancellations count, room nights lost, revenue lost, which stay months affected. If zero cancellations, say so explicitly.]

## Segment Mix
[2-3 sentences: top segments by room night share with percentages. Flag concentration risks. OTA %, group %.]

## The #1 Thing to Act On Today
[One direct, specific recommendation. Name the segment or month. Name the action. Name the commercial reason. One paragraph only.]
```

## Rules
- Lead with the most commercially significant finding
- Use actual numbers — never vague language like "significant" without a figure
- The #1 action must be specific: name the segment, month, and what to do
- Keep the full briefing under 350 words
- Do not list every metric — prioritise what matters most
- If July has unusual volume (group-heavy), call it out explicitly
- If OTA > 40% of future room nights, flag as concentration risk
- If any single segment > 50% of room nights, flag as dependency risk

## Tone
Confident, direct, commercial. Think: a sharp revenue manager presenting at the morning stand-up.
Not: a data report. Not: a list of numbers. A point of view with a recommendation.
