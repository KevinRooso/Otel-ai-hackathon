import { SUGGESTED_QUESTIONS } from '../../utils/suggestedQuestions'

function SuggestedQuestions({ onSelect }) {
  return (
    <div className="suggested-questions">
      <p className="suggested-label">Try asking...</p>
      <div className="question-chips">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button key={i} className="question-chip" onClick={() => onSelect(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SuggestedQuestions
