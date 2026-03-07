import { useRef, useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LayoutGrid, Trash2, Quote } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Shared quote-on-select logic ─────────────────────────────────────────────

function QuoteTooltip({ tooltip, onFire }) {
  if (!tooltip) return null
  return (
    <button
      className="quote-tooltip"
      style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
      onClick={onFire}
    >
      <Quote size={11} /> Quote in chat
    </button>
  )
}

function useQuoteSelect(containerRef, onQuote) {
  const [tooltip, setTooltip] = useState(null)

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 12) { setTooltip(null); return }
    if (containerRef.current && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setTooltip(null); return
      }
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 10 })
  }, [containerRef])

  useEffect(() => {
    const dismiss = (e) => { if (!e.target.closest('.quote-tooltip')) setTooltip(null) }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [])

  const fireQuote = () => {
    if (!tooltip) return
    onQuote(tooltip.text)
    setTooltip(null)
    window.getSelection()?.removeAllRanges()
  }

  return { tooltip, handleMouseUp, fireQuote }
}

// ── Single canvas card ───────────────────────────────────────────────────────

function CanvasCard({ item, onQuote }) {
  const ref = useRef(null)
  const { tooltip, handleMouseUp, fireQuote } = useQuoteSelect(ref, onQuote)

  return (
    <>
      <QuoteTooltip tooltip={tooltip} onFire={fireQuote} />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div style={{
          padding: '0.7rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem',
        }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)',
            lineHeight: 1.4, flex: 1,
          }}>
            {item.query}
          </span>
          <span style={{
            fontSize: '0.68rem', color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)', flexShrink: 0, paddingTop: '0.1rem',
          }}>
            {new Date(item.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Card body — selectable for quoting */}
        <div
          ref={ref}
          onMouseUp={handleMouseUp}
          className="md"
          style={{ padding: '1rem 1.125rem', userSelect: 'text' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.response}</ReactMarkdown>
        </div>

        {/* Quote hint */}
        <div style={{
          padding: '0.4rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: '0.3rem',
        }}>
          <Quote size={9} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>Select text to quote in chat</span>
        </div>
      </motion.div>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DashboardCanvas({ items, onClear, onQuote }) {
  if (items.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1rem', padding: '3rem 2rem',
        minHeight: 0,
      }}>
        <LayoutGrid size={28} strokeWidth={1.25} style={{ color: 'var(--border)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
          <p style={{
            fontSize: '0.82rem', color: 'var(--text-3)',
            textAlign: 'center', lineHeight: 1.7, maxWidth: '260px',
          }}>
            Ask a data question in chat. Tables and analyses will appear here as selectable cards.
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', opacity: 0.55, textAlign: 'center', maxWidth: '240px' }}>
            Try: "Show me a segment breakdown by revenue" or "Which months have the most cancellations?"
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.625rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-3)',
        }}>
          {items.length} {items.length === 1 ? 'analysis' : 'analyses'}
        </span>
        <button
          onClick={onClear}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font)',
            padding: '0.2rem 0.4rem', borderRadius: 'var(--radius)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          <Trash2 size={11} /> Clear all
        </button>
      </div>

      {/* Scrollable card list */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto',
        padding: '1.25rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <AnimatePresence initial={false}>
          {items.map(item => (
            <CanvasCard key={item.id} item={item} onQuote={onQuote} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
