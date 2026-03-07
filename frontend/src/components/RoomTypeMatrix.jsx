function RoomTypeMatrix({ memory }) {
  const preferences = Object.entries(memory?.preferences || {})
  const thresholds = Object.entries(memory?.thresholds || {})

  return (
    <section className="panel room-matrix">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Persistent memory</p>
          <h2>GM context carried across sessions</h2>
        </div>
      </div>

      <div className="memory-grid">
        <div>
          <h3>Preferences</h3>
          {preferences.length ? (
            preferences.map(([key, value]) => (
              <div className="memory-row" key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))
          ) : (
            <p className="muted">No stored output preferences yet.</p>
          )}
        </div>

        <div>
          <h3>Thresholds</h3>
          {thresholds.length ? (
            thresholds.map(([key, value]) => (
              <div className="memory-row" key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))
          ) : (
            <p className="muted">No custom thresholds stored yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default RoomTypeMatrix
