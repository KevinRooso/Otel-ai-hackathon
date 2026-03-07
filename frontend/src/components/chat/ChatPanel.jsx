import { useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import SuggestedQuestions from './SuggestedQuestions'

function ChatPanel({ messages, isLoading, error, onSendMessage }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && <SuggestedQuestions onSelect={onSendMessage} />}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
        </AnimatePresence>
        {isLoading && <TypingIndicator />}
        {error && <div className="chat-error">{error}</div>}
        <div ref={scrollRef} />
      </div>
      <ChatInput onSend={onSendMessage} disabled={isLoading} />
    </div>
  )
}

export default ChatPanel
