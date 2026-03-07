import { AnimatePresence } from 'framer-motion'
import SidebarSection from './SidebarSection'
import InsightCard from './InsightCard'
import ArtifactTable from './ArtifactTable'
import ArtifactChart from './ArtifactChart'

function InsightsSidebar({ artifacts, onClear }) {
  const kpis = artifacts.filter(a => a.type === 'kpi')
  const tables = artifacts.filter(a => a.type === 'table')
  const charts = artifacts.filter(a => a.type === 'chart')

  return (
    <aside className="insights-sidebar">
      <div className="sidebar-header">
        <h3>Insights</h3>
        {artifacts.length > 0 && (
          <button className="ghost-button" onClick={onClear}>Clear all</button>
        )}
      </div>
      <div className="sidebar-content">
        {kpis.length > 0 && (
          <SidebarSection title="Key Metrics" defaultOpen>
            <AnimatePresence>
              {kpis.map(kpi => <InsightCard key={kpi.id} {...kpi} />)}
            </AnimatePresence>
          </SidebarSection>
        )}
        {tables.length > 0 && (
          <SidebarSection title="Data Tables" defaultOpen>
            {tables.map(t => <ArtifactTable key={t.id} data={t.data} title={t.title} />)}
          </SidebarSection>
        )}
        {charts.length > 0 && (
          <SidebarSection title="Charts" defaultOpen>
            {charts.map(c => <ArtifactChart key={c.id} data={c.data} title={c.title} />)}
          </SidebarSection>
        )}
        {artifacts.length === 0 && (
          <p className="sidebar-empty">Insights will appear here as you chat with Otel AI.</p>
        )}
      </div>
    </aside>
  )
}

export default InsightsSidebar
