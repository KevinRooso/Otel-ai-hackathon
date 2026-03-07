import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TypingIndicator from './TypingIndicator'
import ArtifactChart from '../sidebar/ArtifactChart'
import { extractFollowUpQuestionsFromHtml, extractResponseArtifactsFromHtml } from '../../utils/responseArtifacts'

function isHtmlResponse(content) {
  return /<\/?(section|div|h2|h3|p|ul|ol|li|strong|span)\b/i.test(content)
}

function getCollapsedContent(content, isHtml) {
  if (!isHtml) {
    return content.slice(0, 300)
  }

  const stripped = content
    .replace(/<div class="otel-response__metrics">[\s\S]*?<\/div>/i, '')
    .replace(/<div class="otel-response__section[^"]*">[\s\S]*?<\/div>/gi, '')
  return stripped
}

function MessageBubble({ role, content, loading = false, loadingMode = 'chat', messageId, onFollowUpSelect }) {
  const [expanded, setExpanded] = useState(false)
  if (loading) {
    return (
      <motion.div
        className={`message-bubble ${role}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <TypingIndicator mode={loadingMode} />
      </motion.div>
    )
  }

  const isLong = content.length > 480
  const renderAsHtml = role === 'assistant' && isHtmlResponse(content)
  const displayContent = (!expanded && isLong) ? getCollapsedContent(content, renderAsHtml) : content
  const responseArtifacts = renderAsHtml ? extractResponseArtifactsFromHtml(content, messageId) : []
  const followUps = renderAsHtml ? extractFollowUpQuestionsFromHtml(content) : []

  return (
    <motion.div
      className={`message-bubble ${role}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {role === 'assistant' ? (
        <div className={!expanded && isLong ? 'message-collapsed' : ''}>
          {renderAsHtml ? (
            <>
              <div dangerouslySetInnerHTML={{ __html: displayContent }} />
              {expanded || !isLong ? (
                <div className="response-artifact-stack">
                  {responseArtifacts.map((artifact) => (
                    <ArtifactChart
                      key={artifact.id}
                      data={artifact.data}
                      title={artifact.title}
                      chartType={artifact.chartType}
                      compact
                    />
                  ))}
                </div>
              ) : null}
              {(expanded || !isLong) && followUps.length > 0 ? (
                <div className="follow-up-chip-group">
                  {followUps.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="follow-up-chip"
                      onClick={() => onFollowUpSelect?.(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
          )}
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
