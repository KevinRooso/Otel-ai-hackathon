# Concentration Risk Skill

## When to Activate
Activate when the GM asks about:
- OTA dependency or OTA share
- Business concentration or diversification
- "Are we too dependent on...?"
- Segment concentration or single-source risk
- Group block dependency
- Company concentration

## Process
1. Call `get_concentration_risk()` to get all concentration metrics in one call
2. Call `get_segment_mix()` if detailed segment breakdown is needed
3. Assess against thresholds (or GM custom thresholds from memory)

## Thresholds
| Metric | Healthy | Warning | Critical |
|---|---|---|---|
| OTA % of room nights | < 30% | 30-40% | > 40% |
| Any single segment % | < 35% | 35-50% | > 50% |
| Top company % of revenue | < 15% | 15-25% | > 25% |
| Group block % of room nights | < 30% | 30-45% | > 45% |

## Output Format

CONCENTRATION ASSESSMENT: [Healthy / Warning / Critical]

[1-2 sentences on the dominant risk factor with actual numbers]

Breakdown:
- OTA: X% of room nights [status]
- Top segment ([name]): X% [status]
- Top company ([name]): X% of revenue [status]
- Group blocks: X% of room nights [status]

RECOMMENDATION: [One specific action to reduce the most critical concentration risk]

## Rules
- Always compare against GM custom thresholds if they exist in memory
- State the threshold being used (default or custom)
- If multiple risks are flagged, lead with the most critical one
- Always name the specific segment/company/channel — never say "a single segment"
- Include month-level detail if concentration varies significantly by month
