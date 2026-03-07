const LOADING_STAGES = [
  'Reviewing live revenue context',
  'Querying bookings, pickup, and cancellations',
  'Assembling the commercial story',
  'Formatting a polished response',
]

function TypingIndicator({ mode = 'chat' }) {
  const labels = mode === 'briefing'
    ? [
        'Preparing your opening snapshot',
        'Loading today\'s revenue signals',
        'Turning the data into briefing highlights',
      ]
    : LOADING_STAGES

  return (
    <div className="typing-indicator">
      <div className="typing-indicator__dots" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <div className="typing-indicator__content">
        <p className="typing-indicator__title">
          {mode === 'briefing' ? 'Getting your briefing ready' : 'Otel AI is working through the numbers'}
        </p>
        <ul className="typing-indicator__steps">
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default TypingIndicator
