import { motion } from 'framer-motion'

function InsightCard({ label, value, detail, tone = 'neutral', id }) {
  return (
    <motion.article
      className={`metric-card tone-${tone}`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
    >
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </motion.article>
  )
}

export default InsightCard
