function AlertsPanel({ alerts }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Critical alerts</p>
          <h2>What needs attention</h2>
        </div>
      </div>

      <div className="alert-list">
        {alerts.length ? (
          alerts.map((alert, index) => (
            <article className="alert-card" key={`${alert}-${index}`}>
              <span className="alert-index">0{index + 1}</span>
              <p>{alert}</p>
            </article>
          ))
        ) : (
          <p className="muted">Alerts appear here after the first briefing response is available.</p>
        )}
      </div>
    </section>
  )
}

export default AlertsPanel
