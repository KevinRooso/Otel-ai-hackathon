export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('en-US').format(Number(value))
}

export function formatCurrency(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return `${Number(value).toFixed(digits)}%`
}

export function monthLabel(value) {
  if (!value) {
    return 'Unknown month'
  }

  const [year, month] = value.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function splitBriefing(response) {
  if (!response) {
    return []
  }

  return response
    .split(/\n+/)
    .map((section) => section.trim())
    .filter(Boolean)
}

export function extractAlerts(response) {
  const sections = splitBriefing(response)

  return sections
    .filter((section) => /risk|opportunity|action|cancel|ota|group|pickup/i.test(section))
    .slice(0, 3)
}
