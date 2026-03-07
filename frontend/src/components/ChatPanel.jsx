import { useState } from 'react'

function ChatPanel({ messages, onSendMessage, chatLoading, disabled }) {
  const [draft, setDraft] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!draft.trim() || chatLoading || disabled) {
      return
    }

    onSendMessage(draft)
    setDraft('')
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Follow-up analysis</p>
          <h2>Ask Aura AI</h2>
        </div>
      </div>

      <div className="chat-log">
        {messages.length ? (
          messages.map((message, index) => (
            <article className={`chat-bubble role-${message.role}`} key={`${message.role}-${index}-${message.content.slice(0, 16)}`}>
              <span className="chat-role">{message.role === 'user' ? 'GM' : 'Aura'}</span>
              <p>{message.content}</p>
            </article>
          ))
        ) : (
          <p className="muted">Ask a commercial question like “Are we too dependent on OTA?” or “What changed in the last 7 days?”</p>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          className="text-area"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a hotel revenue question..."
          rows="4"
          disabled={disabled}
        />
        <button className="primary-button" type="submit" disabled={disabled || chatLoading || !draft.trim()}>
          {chatLoading ? 'Thinking...' : 'Send question'}
        </button>
      </form>
    </section>
  )
}

export default ChatPanel
