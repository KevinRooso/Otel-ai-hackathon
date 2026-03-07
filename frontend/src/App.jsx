import { useState } from 'react'
import ApiKeyGate from './components/ApiKeyGate'
import Header from './components/Header'
import Dashboard from './components/Dashboard'

export default function App() {
  const [apiKey, setApiKey]             = useState(localStorage.getItem('or_key') || '')
  // briefingHistory = silent context from /briefing, never shown in chat
  const [briefingHistory, setBriefingHistory] = useState([])
  // chatHistory = only what the GM typed + agent responses in the chat panel
  const [chatHistory, setChatHistory]   = useState([])

  const handleConnect = (key) => {
    setApiKey(key)
    setBriefingHistory([])
    setChatHistory([])
  }

  const handleDisconnect = () => {
    localStorage.removeItem('or_key')
    setApiKey('')
    setBriefingHistory([])
    setChatHistory([])
  }

  if (!apiKey) return <ApiKeyGate onConnect={handleConnect} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header apiKey={apiKey} onDisconnect={handleDisconnect} />
      <Dashboard
        apiKey={apiKey}
        briefingHistory={briefingHistory}
        chatHistory={chatHistory}
        onBriefingHistory={setBriefingHistory}
        onChatHistory={setChatHistory}
      />
    </div>
  )
}
