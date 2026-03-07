import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLOURS = ['#22C55E', '#16A34A', '#15803D', '#166534', '#14532D', '#052E16',
                 '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '0.6rem 0.875rem',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: '0.25rem' }}>{d.name}</div>
      <div style={{ color: 'var(--text-2)' }}>{d.room_nights} room nights</div>
      <div style={{ color: 'var(--text-3)' }}>{d.pct}% of total</div>
    </div>
  )
}

// Parse segment data from briefing text
function parseSegments(briefingText) {
  if (!briefingText) return []

  // Look for table rows with segment data
  const tableRegex = /\|\s*([^|]+?)\s*\|\s*[\$€]?([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d.]+)%/g
  const results = []
  let m

  while ((m = tableRegex.exec(briefingText)) !== null) {
    const name = m[1].trim()
    if (name.toLowerCase().includes('segment') || name.toLowerCase().includes('market')) continue
    const room_nights = parseInt(m[3].replace(',', ''), 10)
    const pct = parseFloat(m[4])
    if (!isNaN(room_nights) && room_nights > 0) {
      results.push({ name, room_nights, pct })
    }
  }

  // Fallback: look for "X room nights" patterns near segment names
  if (results.length === 0) {
    const segPatterns = [
      { pattern: /Conference[^)]*\(CNI\)[^:]*:\s*(\d+)\s*RNs?/i, name: 'Conference / Incentive' },
      { pattern: /Corporate Group[^:]*:\s*(\d+)\s*RNs?/i,         name: 'Corporate Group' },
      { pattern: /Event Demand[^:]*:\s*(\d+)\s*RNs?/i,            name: 'Event Demand' },
      { pattern: /OTA[^:]*:\s*(\d+)\s*RNs?/i,                     name: 'OTA' },
      { pattern: /SMERF[^:]*:\s*(\d+)\s*RNs?/i,                   name: 'SMERF Group' },
    ]
    for (const { pattern, name } of segPatterns) {
      const match = briefingText.match(pattern)
      if (match) results.push({ name, room_nights: parseInt(match[1], 10), pct: 0 })
    }
  }

  return results.sort((a, b) => b.room_nights - a.room_nights).slice(0, 8)
}

export default function SegmentChart({ briefingText, loading }) {
  const data = parseSegments(briefingText)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <span style={{
        fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        Segment Mix — Room Nights
      </span>

      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem 0.75rem',
      }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>
            {[90, 65, 50, 35, 25].map((w, i) => (
              <div key={i} className="skeleton" style={{ height: '22px', width: `${w}%`, borderRadius: '4px' }} />
            ))}
          </div>
        )}

        {!loading && data.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', padding: '0.5rem 0' }}>
            Ask about segment mix to see the chart.
          </p>
        )}

        {!loading && data.length > 0 && (
          <ResponsiveContainer width="100%" height={data.length * 38 + 20}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="name" width={160}
                tick={{ fill: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--font)' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="room_nights" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
