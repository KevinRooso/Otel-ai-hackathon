import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
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

function ArtifactChart({ data, title, chartType, compact = false }) {
  if (!data || data.length === 0) return null

  const shapedType = inferChartShape(data, chartType)
  const chartData = shapeResponseVisualizationData(data, shapedType)
  const keys = Object.keys(chartData[0])
  const labelKey = keys.find((k) => typeof chartData[0][k] === 'string') || keys[0]
  const valueKeys = keys.filter((k) => typeof chartData[0][k] === 'number')
  const height = compact ? 180 : 200

  return (
    <div className={`artifact-chart artifact-chart--${shapedType} ${compact ? 'artifact-chart--compact' : ''}`}>
      {title && <h4>{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        {shapedType === 'trend' ? (
          <AreaChart data={chartData}>
            <XAxis dataKey={labelKey} tick={{ fill: '#94a9b6', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a9b6', fontSize: 11 }} />
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
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={compact ? 34 : 42}
              outerRadius={compact ? 58 : 66}
              paddingAngle={4}
            >
              {chartData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        ) : (
          <BarChart data={chartData}>
            <XAxis dataKey={labelKey} tick={{ fill: '#94a9b6', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a9b6', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            {valueKeys.slice(0, 4).map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export default ArtifactChart
