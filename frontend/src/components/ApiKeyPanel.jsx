function ApiKeyPanel({
  apiKey,
  onApiKeyChange,
  onSave,
  health,
  healthLoading,
  briefingLoading,
  backendError,
}) {
  return (
    <section className="panel panel-hero">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Session control</p>
          <h2>Connect the agent runtime</h2>
        </div>
        <div className={`status-chip ${health?.db ? 'is-good' : 'is-muted'}`}>
          <span className="status-dot" />
          {healthLoading ? 'Checking backend' : `Backend ${health?.status || 'unknown'}`}
        </div>
      </div>

      <p className="muted">
        Paste an OpenRouter API key to unlock the morning briefing and follow-up chat. The key stays in this browser session.
      </p>

      <div className="api-key-row">
        <input
          className="text-input"
          type="password"
          placeholder="sk-or-v1-..."
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
        />
        <button className="primary-button" onClick={onSave} disabled={!apiKey.trim() || briefingLoading}>
          {briefingLoading ? 'Loading...' : 'Run briefing'}
        </button>
      </div>

      <div className="inline-notes">
        <span className="info-pill">Health uses `GET /health`</span>
        <span className="info-pill">Briefing uses `POST /briefing`</span>
        <span className="info-pill">Chat uses `POST /chat`</span>
      </div>

      {backendError ? <p className="error-text">{backendError}</p> : null}
    </section>
  )
}

export default ApiKeyPanel
