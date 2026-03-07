import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, MessageSquare } from 'lucide-react'
import { useState } from 'react'

const TREND_META = {
  up:      { Icon: TrendingUp,   color: 'var(--positive)' },
  down:    { Icon: TrendingDown, color: 'var(--danger)' },
  neutral: { Icon: Minus,        color: 'var(--text-3)' },
}

const ASK_QUESTIONS = {
  'Total Revenue':  'Break down our total revenue by month and segment.',
  'Room Nights':    'How are our room nights distributed across months and segments?',
  'Blended ADR':    'How does our ADR compare across segments and room types?',
  'OTA Share':      'Is our OTA dependency a risk? What should we do about it?',
}

export default function MetricCard({ label, value, sub, trend = 'neutral', index = 0, onQuote }) {
  const [hovered, setHovered] = useState(false)
  const { Icon, color } = TREND_META[trend] || TREND_META.neutral
  const question = ASK_QUESTIONS[label]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${hovered ? 'var(--border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.125rem',
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
        flex: 1, minWidth: 0,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s',
        cursor: question && onQuote ? 'default' : 'default',
      }}
    >
      {/* Corner radial accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 64, height: 64,
        background: `radial-gradient(circle at top right, ${color}18, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'opacity 0.2s',
        opacity: hovered ? 1.5 : 1,
      }} />

      <span style={{
        fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-3)',
      }}>
        {label}
      </span>

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.45rem', fontWeight: 500,
        color: 'var(--text-1)', lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </span>

      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
          <Icon size={11} style={{ color, flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{sub}</span>
        </div>
      )}

      {/* Ask about this metric button — appears on hover */}
      {question && onQuote && hovered && (
        <button
          onClick={() => onQuote(question)}
          title="Ask about this metric"
          style={{
            position: 'absolute', bottom: '0.625rem', right: '0.625rem',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '0.2rem 0.5rem',
            color: 'var(--text-3)', fontSize: '0.65rem', fontFamily: 'var(--font)',
            cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--cta)'; e.currentTarget.style.borderColor = 'var(--cta)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <MessageSquare size={9} /> Ask
        </button>
      )}
    </motion.div>
  )
}
