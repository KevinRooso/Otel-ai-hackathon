import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#0d93f2', '#58d6a7', '#ffd36a', '#ff7a85']

function ArtifactChart({ data, title }) {
  if (!data || data.length === 0) return null

  const keys = Object.keys(data[0])
  const labelKey = keys.find(k => typeof data[0][k] === 'string') || keys[0]
  const valueKeys = keys.filter(k => typeof data[0][k] === 'number')

  return (
    <div className="artifact-chart">
      {title && <h4>{title}</h4>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey={labelKey} tick={{ fill: '#94a9b6', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a9b6', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#0d1b24', border: '1px solid rgba(116,168,198,0.16)', borderRadius: 8 }}
            labelStyle={{ color: '#e8f4fb' }}
          />
          {valueKeys.slice(0, 4).map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ArtifactChart
