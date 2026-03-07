# Morning Briefing Skill

### When to Activate
Activate on app startup (automatic) or when the GM asks for:
- "morning briefing", "daily briefing", "what should I know today"
- "give me an overview", "what's the situation"

### Process
Run all five tools in a single turn (parallel):
1. `get_otb_summary(months_ahead=5)` — full revenue position
2. `get_pickup(days=7)` — what changed in the last week
3. `get_cancellations(days=7)` — recent cancellations
4. `get_segment_mix()` — current business mix
5. `get_concentration_risk()` — dependency and concentration risk summary

Then synthesise into a single structured briefing.

### Output Format

```
### Good morning. Here is your revenue position for [date].

**On the Books**
[2-3 sentences: total room nights, revenue, ADR across the horizon. Call out the biggest month.]

**Last 7 Days — Pickup**
[1-2 sentences: new bookings in last 7 days — room nights, revenue, which segments drove it.]

**Last 7 Days — Cancellations**
[1 sentence: cancellations — room nights lost, which stay months affected. If none, say so.]

**Segment Mix**
[2-3 sentences: OTA %, group %, corporate %. Flag any concentration risk.]

---
**The #1 thing to act on today:**
[One clear, specific recommendation based on the data above. Be direct. Name the action, the month, and the reason.]
```

### Rules
- Lead with the most commercially significant finding
- Use actual numbers — never vague language like "significant" without a figure
- The #1 action must be specific: name the segment, month, and what to do
- Keep the full briefing under 350 words
- Do not list every metric — prioritise what matters most
- If July has unusual volume (group-heavy), call it out explicitly
- If OTA > 40% of future room nights, flag as concentration risk
- If any single segment > 50% of room nights, flag as dependency risk

### Tone
Confident, direct, commercial. Think: a sharp revenue manager presenting at the morning stand-up.
Not: a data report. Not: a list of numbers. A point of view with a recommendation.
