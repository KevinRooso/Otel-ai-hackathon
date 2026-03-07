import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

function SidebarSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="sidebar-section">
      <button className="section-toggle" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <ChevronDown className={`chevron ${open ? 'open' : ''}`} size={16} />
      </button>
      {open && <div className="section-content">{children}</div>}
    </div>
  )
}

export default SidebarSection
