import { useState } from 'react'
import { useTraces } from './hooks/useTrace'
import TopBar from './components/TopBar' 
import Sidebar    from './components/Sidebar'
import Timeline from './components/Timeline'
import FlameGraph from './components/FlameGraph'
import SpanDetail from './components/SpanDetail'
import ServiceGraph  from './components/ServiceGraph'

import './index.css'

const TABS = ['timeline', 'flame', 'detail','graph']

export default function App() {
  const [tab, setTab] = useState('timeline')
  const {
    traces, selectedTrace, connected,
    filter, setFilter,
    selectTrace, clearTraces,
  } = useTraces()

  return (
    <div className="app">
      <TopBar
        connected={connected}
        onClear={clearTraces}
      />

      <div className="main">
        <Sidebar
          traces={traces}
          selected={selectedTrace}
          filter={filter}
          onFilter={setFilter}
          onSelect={selectTrace}
        />

        <div className="panel">
          <div className="tab-bar">
            {TABS.map(t => (
              <button
                key={t}
                className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {!selectedTrace && (
              <div className="empty-state">
                select a trace from the sidebar
              </div>
            )}

            {selectedTrace && tab === 'timeline' && (
              <Timeline trace={selectedTrace} />
            )}
            {selectedTrace && tab === 'flame' && (
              <FlameGraph trace={selectedTrace} />
            )}
            {selectedTrace && tab === 'detail' && (
              <SpanDetail trace={selectedTrace} />
            )}

            {tab === 'graph' && <ServiceGraph />}
          </div>
        </div>
      </div>
    </div>
  )
}