function AppHeader({ apiBaseUrl, memorySummary }) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow-row">
          <span className="eyebrow-badge">Google Stitch adaptation</span>
          <span className="live-pill">
            <span className="live-dot" />
            Revenue agent live shell
          </span>
        </div>
        <h1>Aetheris Commercial Intelligence Hub</h1>
        <p className="muted">
          Revenue Manager Agent dashboard for the hotel GM. Backend target: {apiBaseUrl}
        </p>
      </div>

      <div className="header-meta">
        <div className="meta-card">
          <span className="meta-label">Stored context</span>
          <strong>{memorySummary}</strong>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
