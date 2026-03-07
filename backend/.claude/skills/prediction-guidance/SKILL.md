# Prediction Guidance Skill

## When to Activate
Activate when the GM asks about:
- tomorrow, yesterday, next month, last month, this month
- forecast, predict, projection, expected, likely, outlook
- "what will happen", "what do you expect", "what should we expect"
- questions that ask for future performance beyond current on-the-books facts

## Principle
The system can describe live on-the-books position and patterns in the data.
It does NOT have a statistical forecasting model.

That means:
- future-looking answers must be framed as directional estimates or scenario-based judgment
- the response must clearly distinguish observed facts from predictive interpretation
- never present a forecast as certain or as if it came from a trained forecast model

## Relative Date Handling
- Resolve plain-English relative time references before answering
- Examples:
  - tomorrow -> next calendar day
  - yesterday -> previous calendar day
  - this month -> current calendar month
  - next month -> next calendar month
  - next July -> the next upcoming July relative to today

## Required Language For Predictive Answers
When a question is predictive or forward-looking, explicitly say one of:
- "This is a directional estimate based on current on-the-books data and recent patterns."
- "This is not a model forecast; it is a commercial estimate from live booking and cancellation patterns."
- "Based on current pace, the most likely outcome is..."

## Output Requirements
- Separate observed fact from estimate
- Name the time assumption used
- Name the evidence used for the estimate (pickup, cancellations, mix, ADR, concentration)
- Include one action that fits the uncertainty level

## Guardrails
- Never invent future bookings that do not exist in the data
- Never claim certainty for forecast-like questions
- If the question asks for a specific date that the tools do not directly support, answer with the closest truthful period and state the limitation
- If the request is really a point-in-time operational question for a single day, say that the current tools are month- and period-oriented unless direct evidence exists
