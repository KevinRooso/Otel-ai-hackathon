function BriefingPanel({ briefing, briefingLoading, briefingSections, lastUpdated }) {
  return (
    <section className="panel briefing-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Morning briefing</p>
          <h2>Aura AI analysis</h2>
        </div>
        <div className="analysis-indicator">
          <span className="analysis-bars">
            <span />
            <span />
            <span />
          </span>
          <span>{briefingLoading ? 'Synthesizing live data...' : `Updated ${lastUpdated}`}</span>
        </div>
      </div>

      {!briefing && !briefingLoading ? (
        <p className="muted">Run the morning briefing to populate the GM-ready narrative and action recommendation.</p>
      ) : null}

      {briefingLoading ? <div className="skeleton-block" /> : null}

      {briefing ? (
        <div className="briefing-content">
          {briefingSections.map((section) => (
            <div className="briefing-section" key={section}>
              {section}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default BriefingPanel
