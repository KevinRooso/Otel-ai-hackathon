import ChatPanel from './chat/ChatPanel'
import InsightsSidebar from './sidebar/InsightsSidebar'

function ChatLayout({
  messages,
  artifacts,
  memory,
  isLoading,
  loadingMode,
  error,
  onSendMessage,
  onClearArtifacts,
  inputDisabled,
  briefingPending,
}) {
  const memoryCount =
    Object.keys(memory?.preferences || {}).length +
    Object.keys(memory?.thresholds || {}).length +
    (memory?.session_log || []).length

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <div className="chat-header-left">
          <h1 className="chat-header-title">Otel AI</h1>
          <span className="health-dot online" />
        </div>
        <div className="chat-header-right">
          {memoryCount > 0 && (
            <span className="memory-badge">{memoryCount} memories</span>
          )}
        </div>
      </header>

      <div className="chat-main">
        <ChatPanel
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          loadingMode={loadingMode}
          error={error}
          inputDisabled={inputDisabled}
        />
        <InsightsSidebar
          artifacts={artifacts}
          onClearArtifacts={onClearArtifacts}
        />
      </div>

    </div>
  )
}

export default ChatLayout
