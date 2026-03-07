import MetricCard from './MetricCard'

// Parse key numbers out of the briefing text
function parseMetrics(briefingText) {
  if (!briefingText) return null

  const roomNights = briefingText.match(/(\d[\d,]*)\s*room nights/i)
  const revenue    = briefingText.match(/[\$€£]?([\d,]+(?:\.\d+)?)\s*(?:in total revenue|in revenue)/i)
  const adr        = briefingText.match(/ADR\s*(?:of)?\s*[\$€£]?([\d,.]+)/i)
  const ota        = briefingText.match(/OTA[^%\d]*([\d.]+)%/i)

  return {
    roomNights: roomNights ? roomNights[1] : '—',
    revenue:    revenue    ? `€${revenue[1]}` : '—',
    adr:        adr        ? `€${adr[1]}` : '—',
    ota:        ota        ? `${ota[1]}%` : '—',
  }
}

export default function MetricCards({ briefingText, loading, onQuote }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ flex: 1, height: '86px', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        ))}
      </div>
    )
  }

  const m = parseMetrics(briefingText)
  if (!m) return null

  return (
    <div style={{ display: 'flex', gap: '0.625rem' }}>
      <MetricCard label="Total Revenue"  value={m.revenue}    sub="on the books"   trend="up"      index={0} onQuote={onQuote} />
      <MetricCard label="Room Nights"    value={m.roomNights} sub="reserved"        trend="up"      index={1} onQuote={onQuote} />
      <MetricCard label="Blended ADR"    value={m.adr}        sub="per room night"  trend="neutral" index={2} onQuote={onQuote} />
      <MetricCard label="OTA Share"      value={m.ota}        sub="of room nights"  trend={parseFloat(m.ota) > 40 ? 'down' : 'up'} index={3} onQuote={onQuote} />
    </div>
  )
}
