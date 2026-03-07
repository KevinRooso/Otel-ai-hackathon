import { useState } from 'react'
import { KeyRound, ArrowRight, Loader2 } from 'lucide-react'
import { checkHealth } from '../api'

export default function ApiKeyGate({ onConnect }) {
  const [key, setKey]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    const trimmed = key.trim()
    if (!trimmed) { setError('Please enter your OpenRouter API key.'); return }
    setLoading(true)
    setError('')
    try {
      await checkHealth()
      localStorage.setItem('or_key', trimmed)
      onConnect(trimmed)
    } catch {
      setError('Could not reach the backend. Make sure it is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleConnect() }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '1.5rem',
      backgroundImage: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(217,142,26,0.08) 0%, transparent 70%)',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        display: 'flex', flexDirection: 'column', gap: '2rem',
      }}>
        {/* Brand mark */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.25rem',
            color: 'var(--cta)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            Otel
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <h1 style={{
              fontFamily: 'var(--font)',
              fontSize: '1.35rem', fontWeight: 600,
              color: 'var(--text-1)', lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}>
              Revenue Intelligence
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
              Connect your OpenRouter key to start your morning briefing and revenue analysis.
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{
              fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-3)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              OpenRouter API Key
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound
                size={14}
                style={{
                  position: 'absolute', left: '0.875rem', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-3)',
                }}
              />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="sk-or-v1-..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 0.875rem 0.75rem 2.4rem',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-1)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--cta)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            {error && (
              <p style={{ fontSize: '0.8rem', color: 'var(--danger)', lineHeight: 1.5 }}>{error}</p>
            )}
          </div>

          <button
            onClick={handleConnect}
            disabled={loading || !key.trim()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.8rem 1.25rem',
              background: loading || !key.trim() ? 'var(--surface-2)' : 'var(--cta)',
              color: loading || !key.trim() ? 'var(--text-3)' : '#fff',
              border: 'none', borderRadius: 'var(--radius)',
              fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font)',
              cursor: loading || !key.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { if (!loading && key.trim()) e.currentTarget.style.background = 'var(--cta-hover)' }}
            onMouseLeave={e => { if (!loading && key.trim()) e.currentTarget.style.background = 'var(--cta)' }}
          >
            {loading
              ? <><Loader2 size={15} className="spin" /> Connecting…</>
              : <><ArrowRight size={15} /> Connect</>
            }
          </button>
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
          Your key is stored in this browser only and never sent to our servers.
        </p>
      </div>
    </div>
  )
}
