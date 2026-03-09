const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const data = await response.json()
      if (data?.detail) {
        message = data.detail
      }
    } catch {
      // ignore JSON parse failures and use fallback message
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function getHealth() {
  return request('/health', { method: 'GET' })
}

export function getMemory() {
  return request('/memory', { method: 'GET' })
}

export function clearMemory() {
  return request('/memory', { method: 'DELETE' })
}

export function getBriefing(apiKey, mode = 'full') {
  return request('/briefing', {
    method: 'POST',
    body: JSON.stringify({ api_key: apiKey || undefined, mode }),
  })
}

export function sendChatMessage({ apiKey, message, history }) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({
      api_key: apiKey || undefined,
      message,
      history,
    }),
  })
}
