# Revenue Analysis Skill

## When to Activate
Activate for any question about revenue, ADR, room nights, occupancy, pickup, cancellations,
segment mix, OTA dependency, group business, corporate share, or booking pace.

## Critical Data Rule — Table Grain
The `reservations_hackathon` table has ONE ROW PER RESERVATION × STAY_DATE.

- A 3-night reservation = 3 rows with the same `reservation_id`
- NEVER count rows as reservations
- Reservation count = `COUNT(DISTINCT reservation_id)`
- Room nights = `SUM(number_of_spaces)` — NOT `COUNT(*)`

## Canonical Metric Definitions

### Reservation count
```sql
COUNT(DISTINCT reservation_id)
-- Default filter: WHERE reservation_status = 'Reserved'
```

### Room nights
```sql
SUM(number_of_spaces)
-- Default filter: WHERE reservation_status = 'Reserved'
```

### Revenue (default)
```sql
SUM(daily_total_revenue_before_tax)
-- Use daily_room_revenue_before_tax ONLY when the question is explicitly about room revenue only
```

### ADR
```sql
SUM(daily_room_revenue_before_tax) / NULLIF(SUM(number_of_spaces), 0)
-- NEVER use AVG(adr_room) — that is an unweighted average by row, not by room night
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

### Cancellations
```sql
WHERE reservation_status = 'Cancelled'
  AND cancellation_datetime BETWEEN :start AND :end
-- Use cancellation_datetime to filter WHEN it was cancelled
-- Use stay_date to show WHICH stays were affected
```

### OTA dependency
```sql
SUM(number_of_spaces) FILTER (WHERE market_code = 'OTA') * 100.0
  / NULLIF(SUM(number_of_spaces), 0) AS ota_pct
-- Flag as risk if > 40%
```

### Group share
```sql
-- is_block = true for group blocks
-- OR market_code IN ('CNI', 'CGR', 'SMERF', 'EVEN') for MICE/leisure group
```

## Date Field Guide
| Question type | Use this field |
|---|---|
| Revenue position / OTB | `stay_date` |
| Pickup / "what was booked" | `create_datetime` |
| Cancellation timing | `cancellation_datetime` |
| Lead time analysis | `lead_time` |

## Cancellation Handling
- **Exclude** `reservation_status = 'Cancelled'` by default on all OTB/revenue questions
- **Include** only when the question explicitly asks about cancellations
- When including, state this assumption clearly in the response

## Market Codes Reference
- `OTA` — Online Travel Agency (Booking.com, Expedia) — retail, third-party
- `BAR` — Best Available Rate — direct transient retail
- `PROM` — Promotional Retail
- `FIT` — Free Independent Traveller — leisure
- `CSR` — Corporate Negotiated
- `CNR` — Corporate Room Nights
- `CNI` — Conference / Incentive Group — MICE
- `CGR` — Corporate Group — MICE
- `EVEN` — Event Demand — MICE
- `SMERF` — SMERF Group (Social, Military, Educational, Religious, Fraternal)

## Tool Selection Guide
| Question | Tool to call |
|---|---|
| Revenue on the books, OTB by month, monthly summary | `get_otb_summary` |
| Pickup, what changed recently, new bookings | `get_pickup` |
| Cancellations, lost business | `get_cancellations` |
| OTA dependency, segment mix, group share, corporate % | `get_segment_mix` |
| Room type ADR, company revenue, concentration, custom | `run_sql` |

## Guardrails
- Always state whether cancelled reservations are included or excluded
- When the question has date ambiguity, state the assumption (e.g. "looking at stay dates April–August")
- Never present a single number without context — always add what's driving it
- Flag OTA > 40% of room nights as a concentration risk
- Flag any single segment > 50% of room nights as a dependency risk
- Numbers should be rounded: revenue to nearest whole number, ADR to 2 decimal places, percentages to 1 decimal place
