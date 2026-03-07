import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Loader2, Quote, X, ChevronDown, ChevronUp } from 'lucide-react'
import { sendChat } from '../api'

const SUGGESTIONS = [
  'What changed in the last 7 days?',
  'Show me a full segment breakdown by revenue',
  'Which months are most at risk right now?',
  'How many room nights did we cancel this week?',
  'Are we overexposed to any single segment?',
]

// Qualifying responses for the analysis canvas
function isCanvasWorthy(text) {
  const hasTable = /\|[^\n]+\|\n\|[-: |]+\|/.test(text)
  const hasRichData = text.length > 350 && (text.match(/\b[\d,]+\b/g) || []).length >= 6
  return hasTable || hasRichData
}

// ── Collapsible agent message ────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 480 // chars

function AgentMessage({ content }) {
  const isLong = content.length > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!isLong)

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div style={{
          maxHeight: expanded ? 'none' : '130px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div className="md">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>

        {/* Fade gradient when collapsed */}
        {isLong && !expanded && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '56px',
            background: 'linear-gradient(to bottom, transparent, var(--surface-2))',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Toggle */}
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            marginTop: '0.4rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '0.72rem', fontFamily: 'var(--font)',
            padding: '0.1rem 0',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--cta)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          {expanded
            ? <><ChevronUp size={12} /> Collapse</>
            : <><ChevronDown size={12} /> Show full response</>
          }
        </button>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ChatInterface({
  apiKey,
  briefingHistory,
  chatHistory,
  onChatHistory,
  onCanvasItem,
  pendingQuote,
  onQuoteConsumed,
}) {
  const [quotedText, setQuotedText] = useState('')
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const bottomRef                   = useRef(null)
  const textareaRef                 = useRef(null)

  const messages = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Consume pending quote — show as non-editable block
  useEffect(() => {
    if (pendingQuote) {
      setQuotedText(pendingQuote)
      onQuoteConsumed()
      setTimeout(() => textareaRef.current?.focus(), 60)
    }
  }, [pendingQuote])

  const send = async (text) => {
    // Build the actual message to send: if there's a quote, prepend it
    const typedMsg  = text || input.trim()
    const fullMsg   = quotedText
      ? `> ${quotedText}\n\n${typedMsg || '(see quoted text above)'}`
      : typedMsg

    if (!fullMsg.trim() || loading) return

    setInput('')
    setQuotedText('')
    setError('')
    setLoading(true)

    try {
      const combinedHistory = [...briefingHistory, ...chatHistory]
      const res = await sendChat(fullMsg, apiKey, combinedHistory)
      const newChatHistory = res.data.history.slice(briefingHistory.length)
      onChatHistory(newChatHistory)

      // Push data-rich responses to canvas
      const latest = res.data.history.at(-1)
      if (latest?.role === 'assistant' && isCanvasWorthy(latest.content)) {
        onCanvasItem({
          id: Date.now(),
          query: typedMsg || `> ${quotedText.slice(0, 60)}…`,
          response: latest.content,
          timestamp: Date.now(),
        })
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    // Auto-grow
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const canSend = !loading && (input.trim().length > 0 || quotedText.length > 0)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', minHeight: 0,
      background: 'var(--surface-1)',
    }}>
      {/* Header */}
      <div style={{
        padding: '0 1.25rem',
        height: '44px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--text-3)',
        }}>
          Ask Anything
        </span>
      </div>

      {/* Messages — scrollable */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        {/* Suggestions when empty */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{
              fontSize: '0.66rem', color: 'var(--text-3)', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '0.25rem',
            }}>
              Suggested questions
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  textAlign: 'left',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.55rem 0.875rem',
                  color: 'var(--text-2)',
                  fontSize: '0.82rem', fontFamily: 'var(--font)',
                  cursor: 'pointer', lineHeight: 1.5,
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--cta)'
                  e.currentTarget.style.background  = 'var(--cta-dim)'
                  e.currentTarget.style.color       = 'var(--text-1)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background  = 'var(--surface-2)'
                  e.currentTarget.style.color       = 'var(--text-2)'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Message list */}
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div
              className={m.role === 'user' ? 'bubble-gm' : 'bubble-agent'}
              style={{ maxWidth: '92%', padding: '0.65rem 0.9rem', fontSize: '0.875rem', lineHeight: 1.65 }}
            >
              {m.role === 'user' ? (
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </p>
              ) : (
                <AgentMessage content={m.content} />
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="bubble-agent" style={{
              padding: '0.65rem 0.9rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <Loader2 size={13} style={{ color: 'var(--text-3)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontSize: '0.8rem', color: 'var(--danger)', textAlign: 'center' }}>{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '0.75rem 1rem 0.875rem',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {/* Non-editable quote block */}
        {quotedText && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            padding: '0.5rem 0.625rem',
            background: 'var(--cta-dim)',
            border: '1px solid rgba(217,142,26,0.2)',
            borderLeft: '2px solid var(--cta)',
            borderRadius: '0 var(--radius) var(--radius) 0',
          }}>
            <Quote size={11} style={{ color: 'var(--cta)', flexShrink: 0, marginTop: '0.2rem' }} />
            <span style={{
              flex: 1, fontSize: '0.78rem', color: 'var(--text-2)',
              fontStyle: 'italic', lineHeight: 1.55,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {quotedText}
            </span>
            <button
              onClick={() => setQuotedText('')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', padding: '0', flexShrink: 0,
                display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              title="Remove quote"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Text input + send */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={quotedText ? 'Add your question about the quote…' : 'Ask about revenue, pickup, segments…'}
            rows={1}
            style={{
              flex: 1, resize: 'none',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-1)',
              fontSize: '0.875rem', fontFamily: 'var(--font)',
              padding: '0.6rem 0.875rem',
              outline: 'none', lineHeight: 1.5,
              minHeight: '38px', maxHeight: '120px',
              overflowY: 'auto',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--cta)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            onClick={() => send()}
            disabled={!canSend}
            title="Send (Enter)"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, flexShrink: 0,
              borderRadius: 'var(--radius)',
              background: canSend ? 'var(--cta)' : 'var(--surface-2)',
              border: 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
              color: canSend ? '#fff' : 'var(--text-3)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (canSend) e.currentTarget.style.background = 'var(--cta-hover)' }}
            onMouseLeave={e => { if (canSend) e.currentTarget.style.background = 'var(--cta)' }}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <Send size={14} />
            }
          </button>
        </div>

        <p style={{ fontSize: '0.62rem', color: 'var(--text-3)', textAlign: 'center' }}>
          Data tables automatically appear in Analysis Canvas
        </p>
      </div>
    </div>
  )
}
