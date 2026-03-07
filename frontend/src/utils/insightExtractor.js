import { formatCurrency, formatPercent, formatNumber, monthLabel } from './formatters'

/**
 * Extract structured artifacts from conversation history tool messages.
 * Each tool result gets a stable ID from tool_call_id to prevent duplicates.
 */
export function extractInsights(history) {
  const artifacts = []
  const seen = new Set()

  for (const msg of history) {
    if (msg.role !== 'tool' || !msg.content || !msg.tool_call_id) continue
    if (seen.has(msg.tool_call_id)) continue
    seen.add(msg.tool_call_id)

    let parsed
    try {
      parsed = JSON.parse(msg.content)
    } catch {
      continue
    }

    // OTB Summary → KPIs + monthly table + chart
    if (parsed.totals && parsed.by_month) {
      const t = parsed.totals
      artifacts.push({
        id: msg.tool_call_id + '-revenue',
        type: 'kpi',
        label: 'Future Room Revenue',
        value: formatCurrency(t.total_revenue),
        detail: `${formatNumber(t.total_room_nights)} room nights on the books`,
        tone: 'accent',
      })
      artifacts.push({
        id: msg.tool_call_id + '-adr',
        type: 'kpi',
        label: 'Blended ADR',
        value: formatCurrency(t.blended_adr, 2),
        detail: `${formatNumber(t.total_reservations)} forward reservations`,
        tone: 'neutral',
      })

      if (parsed.by_month.length > 0) {
        artifacts.push({
          id: msg.tool_call_id + '-monthly',
          type: 'table',
          title: 'Monthly OTB Summary',
          data: parsed.by_month.map(m => ({
            month: monthLabel(m.month),
            room_nights: m.room_nights,
            revenue: Math.round(m.total_revenue),
            adr: Number((m.adr || 0).toFixed(2)),
          })),
        })

        artifacts.push({
          id: msg.tool_call_id + '-chart',
          type: 'chart',
          title: 'Revenue by Month',
          data: parsed.by_month.map(m => ({
            month: monthLabel(m.month),
            revenue: Math.round(m.total_revenue),
            room_nights: m.room_nights,
          })),
        })
      }
    }

    // Concentration risk → KPIs
    if (parsed.ota_pct !== undefined) {
      artifacts.push({
        id: msg.tool_call_id + '-ota',
        type: 'kpi',
        label: 'OTA Dependency',
        value: formatPercent(parsed.ota_pct),
        detail: 'Share of future room nights from OTA',
        tone: parsed.ota_pct > 40 ? 'warning' : 'neutral',
      })
      if (parsed.group_block_pct !== undefined) {
        artifacts.push({
          id: msg.tool_call_id + '-group',
          type: 'kpi',
          label: 'Group Block Share',
          value: formatPercent(parsed.group_block_pct),
          detail: 'Block room nights in the forward mix',
          tone: parsed.group_block_pct > 45 ? 'warning' : 'neutral',
        })
      }
      if (parsed.top_company) {
        artifacts.push({
          id: msg.tool_call_id + '-topco',
          type: 'kpi',
          label: `Top Company: ${parsed.top_company.name || 'Unknown'}`,
          value: formatPercent(parsed.top_company.revenue_pct),
          detail: `${formatCurrency(parsed.top_company.revenue)} in future revenue`,
          tone: (parsed.top_company.revenue_pct || 0) > 25 ? 'warning' : 'neutral',
        })
      }
    }

    // Segment mix → table + chart
    if (parsed.segments || (Array.isArray(parsed) && parsed[0]?.segment)) {
      const segments = parsed.segments || parsed
      if (segments.length > 0) {
        artifacts.push({
          id: msg.tool_call_id + '-segments',
          type: 'table',
          title: 'Segment Mix',
          data: segments.map(s => ({
            segment: s.segment || s.market_code,
            room_nights: s.room_nights,
            pct: Number((s.pct || s.share || 0).toFixed(1)),
          })),
        })
        artifacts.push({
          id: msg.tool_call_id + '-seg-chart',
          type: 'chart',
          title: 'Segment Distribution',
          data: segments.map(s => ({
            segment: s.segment || s.market_code,
            room_nights: s.room_nights,
          })),
        })
      }
    }

    // Pickup → KPIs
    if (parsed.total_new_room_nights !== undefined || parsed.pickup_room_nights !== undefined) {
      const rn = parsed.total_new_room_nights || parsed.pickup_room_nights || 0
      const rev = parsed.total_new_revenue || parsed.pickup_revenue || 0
      artifacts.push({
        id: msg.tool_call_id + '-pickup',
        type: 'kpi',
        label: '7-Day Pickup',
        value: formatNumber(rn) + ' RNs',
        detail: `${formatCurrency(rev)} in new bookings`,
        tone: 'success',
      })
    }

    // Cancellations → KPI
    if (parsed.total_cancelled_room_nights !== undefined || parsed.cancelled_room_nights !== undefined) {
      const rn = parsed.total_cancelled_room_nights || parsed.cancelled_room_nights || 0
      artifacts.push({
        id: msg.tool_call_id + '-cancels',
        type: 'kpi',
        label: 'Recent Cancellations',
        value: formatNumber(rn) + ' RNs lost',
        detail: 'Cancelled in last 7 days',
        tone: rn > 50 ? 'warning' : 'neutral',
      })
    }
  }

  return artifacts
}
