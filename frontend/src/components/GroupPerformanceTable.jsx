function GroupPerformanceTable({ months }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Forward months</p>
          <h2>Revenue runway</h2>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Reservations</th>
              <th>Room nights</th>
              <th>Total revenue</th>
              <th>ADR</th>
            </tr>
          </thead>
          <tbody>
            {months.length ? (
              months.map((month) => (
                <tr key={month.month}>
                  <td>{month.label}</td>
                  <td>{month.reservations}</td>
                  <td>{month.roomNights}</td>
                  <td>{month.totalRevenue}</td>
                  <td>{month.adr}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="table-empty">Briefing data will populate the forward view after connection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default GroupPerformanceTable
