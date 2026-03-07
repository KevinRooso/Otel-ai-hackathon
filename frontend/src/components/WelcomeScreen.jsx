import { useState } from 'react'

function WelcomeScreen({ health, onConnect, onSkip, error }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const healthStatus = health === null
    ? 'loading'
    : health?.db
      ? 'online'
      : 'offline'

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1 className="welcome-title">Otel AI</h1>
        <p className="welcome-subtitle">Revenue Intelligence</p>

        <div className="welcome-health">
          <span className={`health-dot ${healthStatus === 'online' ? 'online' : healthStatus === 'offline' ? 'offline' : ''}`} />
          <span className="health-label">
            {healthStatus === 'loading' && 'Checking backend...'}
            {healthStatus === 'online' && 'Backend connected'}
            {healthStatus === 'offline' && 'Backend unavailable'}
          </span>
        </div>

        <div className="welcome-input-group">
          <label htmlFor="api-key-input">OpenRouter API Key</label>
          <div className="welcome-input-wrapper">
            <input
              id="api-key-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="welcome-input"
            />
            <button
              type="button"
              className="ghost-button toggle-visibility"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && <p className="welcome-error">{error}</p>}

        <div className="welcome-actions">
          <button
            className="primary-button"
            onClick={() => onConnect(apiKey)}
            disabled={!apiKey.trim()}
          >
            Connect
          </button>
          <button
            className="secondary-button"
            onClick={onSkip}
          >
            Skip — use server key
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
