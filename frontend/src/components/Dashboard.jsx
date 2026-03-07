import { useState } from 'react'
import MorningBriefing from './MorningBriefing'
import MetricCards from './MetricCards'
import DashboardCanvas from './DashboardCanvas'
import ChatInterface from './ChatInterface'

export default function Dashboard({ apiKey, briefingHistory, chatHistory, onBriefingHistory, onChatHistory }) {
  const [briefingText, setBriefingText] = useState('')
  const [activeTab, setActiveTab]       = useState('briefing')
  const [canvasItems, setCanvasItems]   = useState([])
  const [canvasBadge, setCanvasBadge]   = useState(false)
  const [pendingQuote, setPendingQuote] = useState('')

  const handleBriefingLoaded = (text, newHistory) => {
    setBriefingText(text)
    onBriefingHistory(newHistory)
  }

  const handleCanvasItem = (item) => {
    setCanvasItems(prev => [item, ...prev])
    setCanvasBadge(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'canvas') setCanvasBadge(false)
  }

  const TABS = [
    { id: 'briefing', label: 'Morning Briefing' },
    { id: 'canvas',   label: 'Analysis Canvas', badge: canvasBadge, count: canvasItems.length },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 390px',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
    }}>
      {/* ── Left panel ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          padding: '0 1.5rem',
          flexShrink: 0,
          height: '44px',
          background: 'var(--surface-1)',
          gap: '0.25rem',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            >
              {tab.label}
              {tab.badge && tab.count > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 17, height: 17, borderRadius: '9px',
                  background: 'var(--cta)', color: '#fff',
                  fontSize: '0.62rem', fontWeight: 700,
                  padding: '0 4px', lineHeight: 1,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Briefing tab — always mounted, hidden via display:none to preserve state */}
        <div style={{
          display: activeTab === 'briefing' ? 'flex' : 'none',
          flex: 1,
          minHeight: 0,
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
          gap: '1.25rem',
        }}>
          <MetricCards
            briefingText={briefingText}
            loading={!briefingText}
            onQuote={setPendingQuote}
          />
          <MorningBriefing
            apiKey={apiKey}
            onBriefingLoaded={handleBriefingLoaded}
            onQuote={setPendingQuote}
          />
        </div>

        {/* Canvas tab */}
        <div style={{
          display: activeTab === 'canvas' ? 'flex' : 'none',
          flex: 1,
          minHeight: 0,
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <DashboardCanvas
            items={canvasItems}
            onClear={() => setCanvasItems([])}
            onQuote={setPendingQuote}
          />
        </div>
      </div>

      {/* ── Right panel — chat ── */}
      <div style={{ minHeight: 0, height: '100%', overflow: 'hidden' }}>
        <ChatInterface
          apiKey={apiKey}
          briefingHistory={briefingHistory}
          chatHistory={chatHistory}
          onChatHistory={onChatHistory}
          onCanvasItem={handleCanvasItem}
          pendingQuote={pendingQuote}
          onQuoteConsumed={() => setPendingQuote('')}
        />
      </div>
    </div>
  )
}
