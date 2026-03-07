import { useEffect, useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import ChatLayout from './components/ChatLayout'
import { getHealth, getMemory, getBriefing, sendChatMessage } from './api/client'
import { extractInsights } from './utils/insightExtractor'

const STORAGE_KEY = 'otel-hackathon-openrouter-key'
const BRIEFING_PLACEHOLDER_ID = 'initial-briefing-placeholder'

function App() {
  const [screen, setScreen] = useState('welcome')
  const [apiKey, setApiKey] = useState(() => window.localStorage.getItem(STORAGE_KEY) || '')
  const [messages, setMessages] = useState([])
  const [conversationHistory, setConversationHistory] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [memory, setMemory] = useState({ preferences: {}, thresholds: {}, session_log: [], session_transcripts: [] })
  const [health, setHealth] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMode, setLoadingMode] = useState('chat')
  const [briefingPending, setBriefingPending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function bootstrap() {
      try {
        const [healthResponse, memoryResponse] = await Promise.all([getHealth(), getMemory()])
        setHealth(healthResponse)
        setMemory(memoryResponse.memory || memoryResponse)
      } catch (err) {
        setError(err.message)
      }
    }

    bootstrap()
  }, [])

  function updateArtifacts(history) {
    const insights = extractInsights(history)
    setArtifacts(insights)
  }

  async function handleBriefing(key) {
    setBriefingPending(true)
    setError(null)
    setMessages((prev) => {
      if (prev.some((msg) => msg.id === BRIEFING_PLACEHOLDER_ID)) {
        return prev
      }

      return [
        ...prev,
        {
          id: BRIEFING_PLACEHOLDER_ID,
          role: 'assistant',
          content: '',
          loading: true,
          loadingMode: 'briefing',
        },
      ]
    })

    try {
      const response = await getBriefing(key, 'greeting')
      setMessages((prev) => prev.map((msg) => (
        msg.id === BRIEFING_PLACEHOLDER_ID
          ? { role: 'assistant', content: response.response }
          : msg
      )))
      setConversationHistory(response.history || [])
      updateArtifacts(response.history || [])

      const memResponse = await getMemory()
      setMemory(memResponse.memory || memResponse)
    } catch (err) {
      setError(err.message)
      setMessages((prev) => prev.filter((msg) => msg.id !== BRIEFING_PLACEHOLDER_ID))
    } finally {
      setBriefingPending(false)
    }
  }

  function handleConnect(key) {
    window.localStorage.setItem(STORAGE_KEY, key)
    setApiKey(key)
    setScreen('chat')
    handleBriefing(key)
  }

  function handleSkip() {
    setApiKey('')
    setScreen('chat')
    handleBriefing('')
  }

  async function handleSendMessage(text) {
    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setLoadingMode('chat')
    setError(null)

    try {
      const response = await sendChatMessage({
        apiKey,
        message: text,
        history: conversationHistory,
      })

      setMessages((prev) => [...prev, { role: 'assistant', content: response.response }])
      setConversationHistory(response.history || [])
      updateArtifacts(response.history || [])

      const memResponse = await getMemory()
      setMemory(memResponse.memory || memResponse)
    } catch (err) {
      setError(err.message)
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  if (screen === 'welcome') {
    return (
      <WelcomeScreen
        health={health}
        onConnect={handleConnect}
        onSkip={handleSkip}
        error={error}
      />
    )
  }

  return (
    <ChatLayout
      messages={messages}
      artifacts={artifacts}
      memory={memory}
      isLoading={isLoading}
      loadingMode={loadingMode}
      briefingPending={briefingPending}
      error={error}
      onSendMessage={handleSendMessage}
      onClearArtifacts={() => setArtifacts([])}
      inputDisabled={isLoading}
    />
  )
}

export default App
