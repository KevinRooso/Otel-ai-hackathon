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

function ArtifactTable({ data, title }) {
  if (!data || data.length === 0) return null
  const columns = Object.keys(data[0])

  return (
    <div className="artifact-table">
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
    </div>
  )
}

export default ArtifactTable
