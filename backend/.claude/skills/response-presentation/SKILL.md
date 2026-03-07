# Response Presentation Skill

## When to Activate
Activate for all assistant responses shown in the chat UI.

## Goal
Present answers as clean, visual HTML fragments rather than plain markdown or emoji-led text.

## Output Contract
- Return valid HTML snippet only for the final user-facing answer
- Do not return Markdown fences, raw Markdown headings, or emojis as structural elements
- Use semantic HTML that renders well inside a chat bubble
- Keep the structure shallow and consistent
- When the data naturally supports comparison or trend, include a compact visual artifact block in the HTML so the frontend can render a response-specific diagram instead of reusing a generic sidebar chart

## Preferred HTML Pattern
```html
<section class="otel-response">
  <div class="otel-response__eyebrow">Revenue Snapshot</div>
  <h2 class="otel-response__title">July is the month to act on</h2>
  <p class="otel-response__lead">You have 214 room nights on the books at $192 ADR, but 61% is concentrated in OTA.</p>

  <div class="otel-response__metrics">
    <div class="otel-metric-card">
      <span class="otel-metric-card__label">Revenue</span>
      <strong class="otel-metric-card__value">$41,122</strong>
    </div>
    <div class="otel-metric-card">
      <span class="otel-metric-card__label">ADR</span>
      <strong class="otel-metric-card__value">$192.00</strong>
    </div>
  </div>

  <div class="otel-response__section">
    <h3>What is driving it</h3>
    <p>Pickup has been group-led while direct transient remains soft.</p>
  </div>

  <div class="otel-response__section otel-response__section--accent">
    <h3>Recommended action</h3>
    <p>Open a targeted direct offer for midweek July stays and hold rate on OTA.</p>
  </div>

  <div class="otel-visualization" data-visual="bar" data-title="Revenue by Month">
    <div class="otel-visualization__item" data-label="May" data-value="31200" data-note="$31.2k"></div>
    <div class="otel-visualization__item" data-label="Jun" data-value="28750" data-note="$28.8k"></div>
    <div class="otel-visualization__item" data-label="Jul" data-value="41122" data-note="$41.1k"></div>
  </div>
</section>
```

## Visualization Contract
- Use a single `.otel-visualization` block when a visual comparison will help
- Set `data-visual` to one of:
  - `bar` for categorical comparisons like month, segment, company, room type
  - `trend` for sequential change over time
  - `donut` for share / mix questions such as OTA vs direct vs group
- Add `data-title` with a short descriptive title
- Add one `.otel-visualization__item` per point with:
  - `data-label` for the category label
  - `data-value` for the raw numeric value
  - optional `data-note` for display text like `$41.1k` or `44.3%`
  - optional `data-series` when multiple series are needed
- Only include visualizations backed by actual tool outputs; never fabricate data points

## Allowed Elements
- `section`, `div`, `h2`, `h3`, `p`, `ul`, `ol`, `li`, `strong`, `span`

## Rules
- Lead with a title and a short lead paragraph
- Use metric cards when 2-4 headline numbers matter
- Use section blocks for drivers, risk, and action
- If the answer is predictive or estimate-based, include a short explicit disclaimer in the lead or first section
- Prefer a response-specific visualization for mix, trend, or comparison questions so the diagram changes with the answer
- Keep classes consistent with the `otel-response*` and `otel-metric-card*` naming pattern
- Never include scripts, inline event handlers, iframes, forms, or external embeds
- Never output full HTML documents like `<html>` or `<body>`
- Keep the HTML compact enough for a chat bubble

## Tone
Executive, polished, and concise. The design should feel like a premium analyst note, not a generic chatbot message.
