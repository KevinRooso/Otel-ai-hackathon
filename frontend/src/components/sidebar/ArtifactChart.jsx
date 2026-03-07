import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = ['#0d93f2', '#58d6a7', '#ffd36a', '#ff7a85']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="artifact-tooltip">
      <p className="artifact-tooltip__label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="artifact-tooltip__row" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function inferChartShape(data, preferredType) {
  if (preferredType) {
    return preferredType
  }

  const keys = Object.keys(data[0] || {})
  const valueKeys = keys.filter((key) => typeof data[0][key] === 'number')
  const labelKey = keys.find((key) => typeof data[0][key] === 'string') || keys[0]

  const looksSequential = data.length > 2 && /(month|date|day|week|period|stay)/i.test(labelKey)
  const looksShare = data.length <= 6 && valueKeys.length === 1 && /(pct|share|mix|percent)/i.test(valueKeys[0])

  if (looksShare) {
    return 'donut'
  }

  if (looksSequential) {
    return 'trend'
  }

  return 'bar'
}

function shapeResponseVisualizationData(data, chartType) {
  if (chartType !== 'donut') {
    return data
  }

  return data.map((item) => ({
    name: item.label || item.name || item.segment || item.month,
    value: item.value ?? item.pct ?? item.share ?? item.room_nights ?? item.revenue,
    note: item.note,
  }))
}

function shouldUseSummaryLayout(chartData, shapedType) {
  if (!chartData?.length) {
    return false
  }

  if (shapedType === 'donut') {
    return chartData.length > 5
  }

  if (shapedType === 'trend') {
    return chartData.length > 8
  }

  return chartData.length > 6
}

function ArtifactChart({ data, title, chartType, compact = false }) {
  if (!data || data.length === 0) return null

  const shapedType = inferChartShape(data, chartType)
  const chartData = shapeResponseVisualizationData(data, shapedType)
  const keys = Object.keys(chartData[0])
  const labelKey = keys.find((k) => typeof chartData[0][k] === 'string') || keys[0]
  const valueKeys = keys.filter((k) => typeof chartData[0][k] === 'number')
  const summaryOnly = compact && shouldUseSummaryLayout(chartData, shapedType)

  if (summaryOnly) {
    return (
      <div className="artifact-chart artifact-chart--summary">
        {title && <h4>{title}</h4>}
        <div className="artifact-summary-list">
          {chartData.slice(0, 5).map((entry, index) => (
            <div key={`${entry[labelKey]}-${index}`} className="artifact-summary-item">
              <div className="artifact-summary-item__topline">
                <span className="artifact-chart__legend-swatch" style={{ background: COLORS[index % COLORS.length] }} />
                <strong className="artifact-summary-item__label">{entry[labelKey]}</strong>
              </div>
              <span className="artifact-summary-item__metrics">
                {valueKeys.slice(0, 2).map((key) => `${key}: ${entry[key]}`).join(' • ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const truncatedChartData = chartData.slice(0, compact ? 5 : 7)
  const height = shapedType === 'donut' ? (compact ? 250 : 280) : compact ? 220 : 250
  const tickFontSize = compact ? 10 : 11
  const chartMargin = shapedType === 'donut'
    ? { top: 8, right: 8, bottom: 8, left: 8 }
    : { top: 10, right: 12, bottom: 30, left: 0 }

  return (
    <div className={`artifact-chart artifact-chart--${shapedType} ${compact ? 'artifact-chart--compact' : ''}`}>
      {title && <h4>{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        {shapedType === 'trend' ? (
          <AreaChart data={truncatedChartData} margin={chartMargin}>
            <XAxis
              dataKey={labelKey}
              tick={{ fill: '#94a9b6', fontSize: tickFontSize }}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
            />
            <YAxis
              tick={{ fill: '#94a9b6', fontSize: tickFontSize }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            {valueKeys.slice(0, 2).map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.18}
              />
            ))}
          </AreaChart>
        ) : shapedType === 'donut' ? (
          <PieChart>
            <Pie
              data={truncatedChartData}
              dataKey="value"
              nameKey="name"
              innerRadius={compact ? 34 : 42}
              outerRadius={compact ? 58 : 66}
              paddingAngle={4}
              labelLine={false}
            >
              {truncatedChartData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        ) : (
          <BarChart data={truncatedChartData} margin={chartMargin} barCategoryGap={compact ? 14 : 18}>
            <XAxis
              dataKey={labelKey}
              tick={{ fill: '#94a9b6', fontSize: tickFontSize }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={truncatedChartData.length > 4 ? -18 : 0}
              textAnchor={truncatedChartData.length > 4 ? 'end' : 'middle'}
              height={truncatedChartData.length > 4 ? 54 : 30}
            />
            <YAxis
              tick={{ fill: '#94a9b6', fontSize: tickFontSize }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            {valueKeys.slice(0, 4).map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={compact ? 26 : 32} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>

      {shapedType === 'donut' ? (
        <div className="artifact-chart__legend">
          {truncatedChartData.map((entry, index) => (
            <div key={`${entry.name}-${index}`} className="artifact-chart__legend-item">
              <span className="artifact-chart__legend-swatch" style={{ background: COLORS[index % COLORS.length] }} />
              <span className="artifact-chart__legend-label">{entry.name}</span>
              <span className="artifact-chart__legend-value">{entry.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ArtifactChart
