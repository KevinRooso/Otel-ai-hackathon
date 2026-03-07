function InsightCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

export default InsightCard
