import { LogOut } from 'lucide-react'

export default function Header({ apiKey, onDisconnect }) {
  const today = new Date().toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}••••` : ''

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', height: '52px',
      background: 'var(--surface-1)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            color: 'var(--cta)',
            letterSpacing: '-0.01em',
          }}>
            Otel
          </span>
          <span style={{
            fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-3)',
          }}>
            Revenue Intelligence
          </span>
        </div>
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--positive)',
            display: 'inline-block',
            boxShadow: '0 0 8px var(--positive)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Live
          </span>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', letterSpacing: '0.01em' }}>
          {today}
        </span>

        {/* Key pill */}
        <span style={{
          fontSize: '0.7rem', fontWeight: 400,
          fontFamily: 'var(--font-mono)',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '0.18rem 0.65rem',
          color: 'var(--text-3)',
        }}>
          {maskedKey}
        </span>

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          title="Disconnect key"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            background: 'none', border: '1px solid transparent', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '0.75rem', fontFamily: 'var(--font)',
            padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)',
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--danger)'
            e.currentTarget.style.borderColor = 'rgba(240,112,112,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-3)'
            e.currentTarget.style.borderColor = 'transparent'
          }}
        >
          <LogOut size={13} />
          <span>Disconnect</span>
        </button>
      </div>
    </header>
  )
}
