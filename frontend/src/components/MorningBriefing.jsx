import { useEffect, useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, TrendingUp, TrendingDown, Calendar, Zap, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { fetchBriefing } from '../api'

// ── Section parsing ──────────────────────────────────────────────────────────

function parseSections(text) {
  if (!text) return {}
  const sections = {}
  const parts = text.split(/^## /m)
  for (const part of parts) {
    if (!part.trim()) continue
    const newline = part.indexOf('\n')
    if (newline === -1) continue
    sections[part.slice(0, newline).trim()] = part.slice(newline + 1).trim()
  }
  return sections
}

const SECTION_META = {
  'On the Books':                { Icon: Calendar,     accent: '#2DD4BF', dim: 'rgba(45,212,191,0.10)' },
  'Last 7 Days — Pickup':        { Icon: TrendingUp,   accent: '#60A5FA', dim: 'rgba(96,165,250,0.10)' },
  'Last 7 Days — Cancellations': { Icon: TrendingDown, accent: '#F07070', dim: 'rgba(240,112,112,0.10)' },
  'Segment Mix':                 { Icon: null,         accent: '#D98E1A', dim: 'rgba(217,142,26,0.10)' },
}

// ── Quote-on-select hook ─────────────────────────────────────────────────────

function useQuoteSelect(containerRef, onQuote) {
  const [tooltip, setTooltip] = useState(null) // { text, x, y }

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

// ── Flash card ───────────────────────────────────────────────────────────────

function FlashCard({ title, body, isAction, onQuote }) {
  const ref = useRef(null)
  const { tooltip, handleMouseUp, fireQuote } = useQuoteSelect(ref, onQuote)

  const meta = isAction ? null : (SECTION_META[title] || { Icon: null, accent: 'var(--border)', dim: 'transparent' })
  const accent  = isAction ? 'var(--cta)'  : meta.accent
  const dimBg   = isAction ? 'var(--cta-dim)' : meta.dim
  const CardIcon = isAction ? Zap : meta.Icon

  return (
    <>
      {tooltip && (
        <button
          className="quote-tooltip"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
          onClick={fireQuote}
        >
          <Quote size={11} /> Quote in chat
        </button>
      )}

      <div
        ref={ref}
        onMouseUp={handleMouseUp}
        style={{
          background: isAction ? dimBg : 'var(--surface-1)',
          border: `1px solid ${isAction ? 'rgba(217,142,26,0.25)' : 'var(--border)'}`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 1.5rem 1.5rem',
          minHeight: '240px',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
          userSelect: 'text',
        }}
      >
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {CardIcon && (
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: isAction ? 'rgba(217,142,26,0.15)' : dimBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CardIcon size={19} style={{ color: accent }} />
            </div>
          )}
          <div>
            <p style={{
              fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isAction ? 'var(--cta)' : accent,
            }}>
              {isAction ? '#1 Action Today' : title}
            </p>
          </div>
        </div>

        {/* Body — larger, more readable typography */}
        <div style={{ flex: 1 }}>
          <div className="md brief-card">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>
        </div>

        {/* Quote hint */}
        <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Quote size={9} /> Select text to quote in chat
        </p>
      </div>
    </>
  )
}

// ── Skeleton cards ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderLeft: '4px solid var(--surface-2)',
      borderRadius: 'var(--radius-lg)', padding: '1.75rem 1.5rem', minHeight: '240px',
      display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10 }} />
        <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {[100, 90, 80, 70, 60].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}%`, height: 14, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

const SLIDE = {
  enter: (d) => ({ x: d > 0 ? '45%' : '-45%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d) => ({ x: d > 0 ? '-45%' : '45%', opacity: 0 }),
}

export default function MorningBriefing({ apiKey, onBriefingLoaded, onQuote }) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [current, setCurrent] = useState(0)
  const direction             = useRef(0)

  const load = async () => {
    setLoading(true)
    setError('')
    setText('')
    setCurrent(0)
    try {
      const res = await fetchBriefing(apiKey)
      setText(res.data.response)
      onBriefingLoaded(res.data.response, res.data.history)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load briefing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Build cards array from parsed sections
  const sections  = parseSections(text)
  const actionKey = Object.keys(sections).find(k => k.toLowerCase().includes('action') || k.includes('#1'))
  const cards     = [
    ...(actionKey ? [{ title: actionKey, body: sections[actionKey], isAction: true }] : []),
    ...Object.entries(sections)
      .filter(([k]) => k !== actionKey)
      .map(([title, body]) => ({ title, body, isAction: false })),
  ]

  const total   = cards.length
  const goTo    = (idx) => { direction.current = idx > current ? 1 : -1; setCurrent(idx) }
  const prev    = () => { if (current > 0) goTo(current - 1) }
  const next    = () => { if (current < total - 1) goTo(current + 1) }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current, total])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: 'var(--text-3)',
        }}>
          Morning Briefing
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!loading && total > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {current + 1} / {total}
            </span>
          )}
          {!loading && (
            <button
              onClick={load}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font)',
                padding: '0.2rem 0.4rem', borderRadius: 'var(--radius)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <RefreshCw size={11} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Skeleton */}
      {loading && <SkeletonCard />}

      {/* Error */}
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>}

      {/* Carousel */}
      {!loading && !error && cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Slide area */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence custom={direction.current} mode="wait">
              <motion.div
                key={current}
                custom={direction.current}
                variants={SLIDE}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <FlashCard
                  title={cards[current].title}
                  body={cards[current].body}
                  isAction={cards[current].isAction}
                  onQuote={onQuote}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Prev */}
            <button
              onClick={prev}
              disabled={current === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 'var(--radius)',
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                cursor: current === 0 ? 'not-allowed' : 'pointer',
                color: current === 0 ? 'var(--text-3)' : 'var(--text-2)',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (current > 0) e.currentTarget.style.borderColor = 'var(--cta)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <ChevronLeft size={15} />
            </button>

            {/* Dot indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {cards.map((card, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  title={card.isAction ? '#1 Action Today' : card.title}
                  style={{
                    width: i === current ? 22 : 6,
                    height: 6,
                    borderRadius: 3,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    background: i === current
                      ? (cards[i].isAction ? 'var(--cta)' : (SECTION_META[cards[i].title]?.accent || 'var(--text-2)'))
                      : 'var(--surface-2)',
                    transition: 'width 0.25s ease, background 0.25s ease',
                  }}
                />
              ))}
            </div>

            {/* Next */}
            <button
              onClick={next}
              disabled={current === total - 1}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 'var(--radius)',
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                cursor: current === total - 1 ? 'not-allowed' : 'pointer',
                color: current === total - 1 ? 'var(--text-3)' : 'var(--text-2)',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (current < total - 1) e.currentTarget.style.borderColor = 'var(--cta)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Keyboard hint */}
          <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'center' }}>
            ← → arrow keys to navigate
          </p>
        </div>
      )}
    </div>
  )
}
