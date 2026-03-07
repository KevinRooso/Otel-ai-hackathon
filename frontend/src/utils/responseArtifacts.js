function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getTextContent(element) {
  return (element.textContent || '').trim()
}

export function extractResponseArtifactsFromHtml(html, messageId) {
  if (!html || typeof window === 'undefined' || !window.DOMParser) {
    return []
  }

  const parser = new window.DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const visualizations = [...doc.querySelectorAll('.otel-visualization')]

  return visualizations
    .map((visual, index) => {
      const type = visual.getAttribute('data-visual') || 'bar'
      const title = visual.getAttribute('data-title') || `Visualization ${index + 1}`
      const items = [...visual.querySelectorAll('.otel-visualization__item')]
        .map((item) => ({
          label: item.getAttribute('data-label') || getTextContent(item),
          value: safeNumber(item.getAttribute('data-value')),
          note: item.getAttribute('data-note') || '',
          series: item.getAttribute('data-series') || 'primary',
        }))
        .filter((item) => item.label && item.value !== null)

      if (items.length === 0) {
        return null
      }

      return {
        id: `${messageId || 'message'}-visual-${index}`,
        type: 'response-chart',
        chartType: type,
        title,
        data: items,
      }
    })
    .filter(Boolean)
}

export function extractFollowUpQuestionsFromHtml(html) {
  if (!html || typeof window === 'undefined' || !window.DOMParser) {
    return []
  }

  const parser = new window.DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const questions = []

  const explicitActions = [...doc.querySelectorAll('[data-follow-up-question]')]
  explicitActions.forEach((element) => {
    const question = (element.getAttribute('data-follow-up-question') || '').trim()
    if (question) {
      questions.push(question)
    }
  })

  if (questions.length > 0) {
    return [...new Set(questions)].slice(0, 4)
  }

  const headings = [...doc.querySelectorAll('h3')]
  const followUpHeading = headings.find((heading) => /dig deeper|next steps|follow-up/i.test(getTextContent(heading)))
  if (!followUpHeading) {
    return []
  }

  let node = followUpHeading.nextElementSibling
  while (node) {
    if (/^H[1-6]$/.test(node.tagName)) {
      break
    }

    if (node.tagName === 'UL' || node.tagName === 'OL') {
      const items = [...node.querySelectorAll('li')]
        .map((item) => getTextContent(item).replace(/^\d+[.)]\s*/, '').split(' — ')[0].trim())
        .filter(Boolean)
      return [...new Set(items)].slice(0, 4)
    }

    node = node.nextElementSibling
  }

  return []
}
