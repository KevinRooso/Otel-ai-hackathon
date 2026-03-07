import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function MessageBubble({ role, content }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = content.length > 480
  const displayContent = (!expanded && isLong) ? content.slice(0, 300) : content

  return (
    <motion.div
      className={`message-bubble ${role}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {role === 'assistant' ? (
        <div className={!expanded && isLong ? 'message-collapsed' : ''}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
          {!expanded && isLong && <div className="message-fade-overlay" />}
        </div>
      ) : (
        <p>{content}</p>
      )}
      {isLong && (
        <button className="show-more-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </motion.div>
  )
}

export default MessageBubble
