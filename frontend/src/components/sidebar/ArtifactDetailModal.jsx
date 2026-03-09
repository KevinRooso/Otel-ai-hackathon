import { useEffect } from 'react'
import { X } from 'lucide-react'
import ArtifactChart from './ArtifactChart'
import ArtifactTable from './ArtifactTable'

function ArtifactDetailModal({ artifact, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!artifact) return null

  return (
    <div className="artifact-modal-backdrop" onClick={onClose}>
      <div className="artifact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="artifact-modal__header">
          <div>
            <p className="artifact-modal__eyebrow">Expanded insight</p>
            <h3>{artifact.title || 'Insight detail'}</h3>
          </div>
          <button type="button" className="artifact-modal__close" onClick={onClose} aria-label="Close detail view">
            <X size={18} />
          </button>
        </div>

        <div className="artifact-modal__body">
          {artifact.type === 'table' ? (
            <ArtifactTable data={artifact.data} title={artifact.title} />
          ) : (
            <ArtifactChart data={artifact.data} title={artifact.title} chartType={artifact.chartType} />
          )}
        </div>
      </div>
    </div>
  )
}

export default ArtifactDetailModal
