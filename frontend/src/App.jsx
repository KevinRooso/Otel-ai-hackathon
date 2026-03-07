import { useEffect, useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import ChatLayout from './components/ChatLayout'
import { getHealth, getMemory, getBriefing, sendChatMessage } from './api/client'
import { extractInsights } from './utils/insightExtractor'

const STORAGE_KEY = 'otel-hackathon-openrouter-key'

function App() {
  const [screen, setScreen] = useState('welcome')
  const [apiKey, setApiKey] = useState(() => window.localStorage.getItem(STORAGE_KEY) || '')
  const [messages, setMessages] = useState([])
  const [conversationHistory, setConversationHistory] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [memory, setMemory] = useState({ preferences: {}, thresholds: {}, session_log: [] })
  const [health, setHealth] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
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
    setIsLoading(true)
    setError(null)

    try {
      const response = await getBriefing(key, 'greeting')
      setMessages((prev) => [...prev, { role: 'assistant', content: response.response }])
      setConversationHistory(response.history || [])
      updateArtifacts(response.history || [])

      const memResponse = await getMemory()
      setMemory(memResponse.memory || memResponse)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
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
      error={error}
      onSendMessage={handleSendMessage}
      onClearArtifacts={() => setArtifacts([])}
    />
  )
}

export default App
