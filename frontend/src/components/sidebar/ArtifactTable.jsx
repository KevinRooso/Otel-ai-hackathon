function formatHeader(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatCell(val) {
  if (val === null || val === undefined) return '--'
  if (typeof val === 'number') {
    if (val > 1000) return new Intl.NumberFormat('en-US').format(val)
    if (val < 1 && val > 0) return (val * 100).toFixed(1) + '%'
    return val.toFixed(val % 1 === 0 ? 0 : 2)
  }
  return String(val)
}

function getDenseDataSummary(data, columns) {
  const labelColumn = columns.find((column) => typeof data[0]?.[column] === 'string') || columns[0]
  return data.slice(0, 4).map((row) => ({
    label: formatCell(row[labelColumn]),
    metrics: columns
      .filter((column) => column !== labelColumn)
      .slice(0, 2)
      .map((column) => `${formatHeader(column)}: ${formatCell(row[column])}`),
  }))
}

function ArtifactTable({ data, title, compact = false, summaryOnly = false, onExpand }) {
  if (!data || data.length === 0) return null
  const columns = Object.keys(data[0])

  if (summaryOnly) {
    const summaryRows = getDenseDataSummary(data, columns)
    return (
      <button type="button" className="artifact-table artifact-table--summary artifact-card-button" onClick={onExpand}>
        {title && <h4>{title}</h4>}
        <div className="artifact-summary-list">
          {summaryRows.map((row) => (
            <div key={row.label} className="artifact-summary-item">
              <strong className="artifact-summary-item__label">{row.label}</strong>
              <span className="artifact-summary-item__metrics">{row.metrics.join(' • ')}</span>
            </div>
          ))}
        </div>
      </button>
    )
  }

  return (
    <div className={`artifact-table ${compact ? 'artifact-table--compact' : ''}`}>
      {title && <h4>{title}</h4>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>{columns.map(col => <th key={col}>{formatHeader(col)}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map(col => <td key={col}>{formatCell(row[col])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onExpand ? (
        <button type="button" className="artifact-expand-link" onClick={onExpand}>
          Open expanded view
        </button>
      ) : null}
    </div>
  )
}

export default ArtifactTable
