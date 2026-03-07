import { useEffect, useMemo, useState } from 'react'
import AppHeader from './components/AppHeader'
import ApiKeyPanel from './components/ApiKeyPanel'
import InsightCard from './components/InsightCard'
import BriefingPanel from './components/BriefingPanel'
import AlertsPanel from './components/AlertsPanel'
import GroupPerformanceTable from './components/GroupPerformanceTable'
import ChurnVelocityChart from './components/ChurnVelocityChart'
import RoomTypeMatrix from './components/RoomTypeMatrix'
import ChatPanel from './components/ChatPanel'
import { clearMemory, getApiBaseUrl, getBriefing, getHealth, getMemory, sendChatMessage } from './api/client'
import { extractAlerts, formatCurrency, formatNumber, formatPercent, monthLabel, splitBriefing } from './utils/formatters'

const STORAGE_KEY = 'otel-hackathon-openrouter-key'

function App() {
  const [apiKey, setApiKey] = useState(() => window.localStorage.getItem(STORAGE_KEY) || '')
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [backendError, setBackendError] = useState('')
  const [briefing, setBriefing] = useState('')
  const [briefingHistory, setBriefingHistory] = useState([])
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [memory, setMemory] = useState({ preferences: {}, thresholds: {}, session_log: [] })
  const [lastUpdated, setLastUpdated] = useState('not yet run')

  useEffect(() => {
    async function bootstrap() {
      setHealthLoading(true)

      try {
        const [healthResponse, memoryResponse] = await Promise.all([getHealth(), getMemory()])
        setHealth(healthResponse)
        setMemory(memoryResponse.memory)
        setBackendError('')
      } catch (error) {
        setBackendError(error.message)
      } finally {
        setHealthLoading(false)
      }
    }

    bootstrap()
  }, [])

  const briefingSections = useMemo(() => splitBriefing(briefing), [briefing])
  const alerts = useMemo(() => extractAlerts(briefing), [briefing])

  const monthlyRows = useMemo(() => {
    const toolMessage = briefingHistory.find(
      (message) => message.role === 'tool' && typeof message.content === 'string' && message.content.includes('by_month')
    )

    if (!toolMessage) {
      return []
    }

    try {
      const parsed = JSON.parse(toolMessage.content)
      return (parsed.by_month || []).map((item) => ({
        month: item.month,
        label: monthLabel(item.month),
        shortLabel: monthLabel(item.month).split(' ')[0],
        reservations: formatNumber(item.reservations),
        roomNights: formatNumber(item.room_nights),
        totalRevenue: formatCurrency(item.total_revenue),
        adr: formatCurrency(item.adr, 2),
        rawRevenue: Number(item.total_revenue || 0),
      }))
    } catch {
      return []
    }
  }, [briefingHistory])

  const totals = useMemo(() => {
    const toolMessage = briefingHistory.find(
      (message) => message.role === 'tool' && typeof message.content === 'string' && message.content.includes('total_room_nights')
    )

    if (!toolMessage) {
      return null
    }

    try {
      const parsed = JSON.parse(toolMessage.content)
      return parsed.totals || null
    } catch {
      return null
    }
  }, [briefingHistory])

  const concentration = useMemo(() => {
    const toolMessage = briefingHistory.find(
      (message) => message.role === 'tool' && typeof message.content === 'string' && message.content.includes('ota_pct')
    )

    if (!toolMessage) {
      return null
    }

    try {
      return JSON.parse(toolMessage.content)
    } catch {
      return null
    }
  }, [briefingHistory])

  const memorySummary = `${Object.keys(memory.preferences || {}).length} prefs • ${Object.keys(memory.thresholds || {}).length} thresholds • ${(memory.session_log || []).length} notes`

  async function refreshMemory() {
    try {
      const response = await getMemory()
      setMemory(response.memory)
    } catch (error) {
      setBackendError(error.message)
    }
  }

  async function handleRunBriefing() {
    if (!apiKey.trim()) {
      setBackendError('OpenRouter API key is required.')
      return
    }

    window.localStorage.setItem(STORAGE_KEY, apiKey)
    setBriefingLoading(true)
    setBackendError('')

    try {
      const response = await getBriefing(apiKey)
      setBriefing(response.response)
      setBriefingHistory(response.history || [])
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      await refreshMemory()
    } catch (error) {
      setBackendError(error.message)
    } finally {
      setBriefingLoading(false)
    }
  }

  async function handleSendMessage(message) {
    if (!apiKey.trim()) {
      setBackendError('Save an OpenRouter API key before sending chat messages.')
      return
    }

    const userPreview = { role: 'user', content: message }
    setChatMessages((current) => [...current, userPreview])
    setChatLoading(true)
    setBackendError('')

    try {
      const response = await sendChatMessage({
        apiKey,
        message,
        history: briefingHistory,
      })

      setBriefingHistory(response.history || [])
      setChatMessages((current) => [...current, { role: 'assistant', content: response.response }])
      await refreshMemory()
    } catch (error) {
      setBackendError(error.message)
      setChatMessages((current) => current.slice(0, -1))
    } finally {
      setChatLoading(false)
    }
  }

  async function handleClearMemory() {
    try {
      await clearMemory()
      await refreshMemory()
    } catch (error) {
      setBackendError(error.message)
    }
  }

  return (
    <div className="app-shell">
      <div className="page-glow page-glow-left" />
      <div className="page-glow page-glow-right" />

      <main className="dashboard">
        <AppHeader apiBaseUrl={getApiBaseUrl()} memorySummary={memorySummary} />

        <div className="dashboard-grid top-grid">
          <ApiKeyPanel
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            onSave={handleRunBriefing}
            health={health}
            healthLoading={healthLoading}
            briefingLoading={briefingLoading}
            backendError={backendError}
          />

          <div className="metrics-grid">
            <InsightCard
              label="Future room revenue"
              value={formatCurrency(totals?.total_revenue)}
              detail={`Across ${formatNumber(totals?.total_room_nights)} room nights on the books`}
              tone="accent"
            />
            <InsightCard
              label="Blended ADR"
              value={formatCurrency(totals?.blended_adr, 2)}
              detail={`${formatNumber(totals?.total_reservations)} forward reservations`}
            />
            <InsightCard
              label="OTA dependency"
              value={formatPercent(concentration?.ota_pct)}
              detail="Share of future room nights from OTA business"
              tone="warning"
            />
            <InsightCard
              label="Group block share"
              value={formatPercent(concentration?.group_block_pct)}
              detail="Block room nights in the forward mix"
            />
          </div>
        </div>

        <div className="dashboard-grid content-grid">
          <div className="primary-column">
            <BriefingPanel
              briefing={briefing}
              briefingLoading={briefingLoading}
              briefingSections={briefingSections}
              lastUpdated={lastUpdated}
            />
            <GroupPerformanceTable months={monthlyRows} />
            <RoomTypeMatrix memory={memory} />
          </div>

          <div className="secondary-column">
            <AlertsPanel alerts={alerts} />
            <ChurnVelocityChart months={monthlyRows} />
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              chatLoading={chatLoading}
              disabled={!apiKey.trim()}
            />
            <section className="panel compact-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Memory controls</p>
                  <h2>Reset stored GM context</h2>
                </div>
              </div>
              <p className="muted">Use this only if you want to wipe saved preferences, thresholds, and recent session notes.</p>
              <button className="secondary-button" onClick={handleClearMemory}>Clear memory</button>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
