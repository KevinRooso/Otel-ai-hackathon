function ChurnVelocityChart({ months }) {
  const maxValue = Math.max(...months.map((month) => month.rawRevenue || 0), 1)

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Visual context</p>
          <h2>Revenue shape</h2>
        </div>
      </div>

      <div className="bar-chart">
        {months.length ? (
          months.map((month) => (
            <div className="bar-column" key={month.month}>
              <div
                className="bar"
                style={{ height: `${Math.max((month.rawRevenue / maxValue) * 100, 8)}%` }}
                title={`${month.label}: ${month.totalRevenue}`}
              />
              <span>{month.shortLabel}</span>
            </div>
          ))
        ) : (
          <p className="muted">The revenue bars render once monthly OTB data is available.</p>
        )}
      </div>
    </section>
  )
}

export default ChurnVelocityChart
