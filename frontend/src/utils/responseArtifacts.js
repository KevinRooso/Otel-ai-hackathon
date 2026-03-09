function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getTextContent(element) {
  return (element.textContent || '').trim()
}

function cleanQuestionText(text) {
  return text
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[-*•]\s*/, '')
    .replace(/^[A-Z][^:]{0,40}:\s*/, '')
    .replace(/\s*—\s.*$/, '')
    .trim()
}

function extractMetricPairs(text) {
  const matches = [...text.matchAll(/([A-Z][A-Za-z /&%-]{2,30})\s*[:\-]\s*(\$?[\d,.]+%?\s*[A-Za-z]{0,8})/g)]
  return matches.slice(0, 4).map((match) => ({
    label: match[1].trim(),
    value: match[2].trim(),
  }))
}

export function normalizeAssistantResponse(content) {
  if (!content || /<\/?(section|div|h2|h3|p|ul|ol|li|strong|span)\b/i.test(content)) {
    return null
  }

  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  if (blocks.length === 0) {
    return null
  }

  const headingIndex = blocks.findIndex((block, index) => index > 0 && block.length < 90)
  const title = headingIndex === 1 ? cleanQuestionText(blocks[0]).replace(/[.:]$/, '') : 'Revenue Intelligence'
  const lead = headingIndex === 1 ? blocks[1] : blocks[0]
  const remaining = headingIndex === 1 ? blocks.slice(2) : blocks.slice(1)

  const sections = []
  const followUps = []
  let metrics = extractMetricPairs(lead)

  for (const block of remaining) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const firstLine = lines[0] || ''
    const looksLikeFollowUps = /worth exploring|dig deeper|next steps|follow-up/i.test(firstLine)
      || lines.some((line) => /^[-*•]|^\d+[.)]/.test(line))

    if (looksLikeFollowUps) {
      lines.forEach((line) => {
        const cleaned = cleanQuestionText(line)
        if (cleaned.length > 8 && cleaned.endsWith('?')) {
          followUps.push(cleaned)
        }
      })
      continue
    }

    const blockMetrics = extractMetricPairs(block)
    if (metrics.length < 4 && blockMetrics.length > 0) {
      metrics = [...metrics, ...blockMetrics].slice(0, 4)
    }

    sections.push({
      title: lines.length > 1 && firstLine.length < 72 ? cleanQuestionText(firstLine).replace(/[.:]$/, '') : '',
      body: lines.length > 1 && firstLine.length < 72 ? lines.slice(1).join(' ') : lines.join(' '),
      accent: /recommended action|one action|action/i.test(firstLine),
    })
  }

  return {
    title,
    lead,
    metrics,
    sections: sections.filter((section) => section.body),
    followUps: [...new Set(followUps)].slice(0, 4),
  }
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

  const allListItems = [...doc.querySelectorAll('li')]
    .map((item) => cleanQuestionText(getTextContent(item)))
    .filter((item) => item.length > 8 && item.endsWith('?'))

  if (allListItems.length > 0) {
    return [...new Set(allListItems)].slice(0, 4)
  }

  const headings = [...doc.querySelectorAll('h2, h3, h4, p, strong')]
  const followUpHeading = headings.find((heading) => /dig deeper|worth exploring|next steps|follow-up/i.test(getTextContent(heading)))
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
        .map((item) => cleanQuestionText(getTextContent(item)))
        .filter((item) => item.length > 4)
      return [...new Set(items)].slice(0, 4)
    }

    if (node.tagName === 'P') {
      const questionsInParagraph = getTextContent(node)
        .split(/\d+[.)]\s*/)
        .map((item) => cleanQuestionText(item))
        .filter((item) => item.length > 8 && item.endsWith('?'))

      if (questionsInParagraph.length > 0) {
        return [...new Set(questionsInParagraph)].slice(0, 4)
      }
    }

    node = node.nextElementSibling
  }

  return []
}
