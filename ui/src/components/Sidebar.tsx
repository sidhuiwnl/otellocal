export default function Sidebar({ traces, selected, filter, onFilter, onSelect }) {
  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-label">traces</span>
        <input
          className="filter-input"
          placeholder="filter..."
          value={filter}
          onChange={e => onFilter(e.target.value)}
        />
      </div>

      <div className="trace-list">
        {traces.length === 0 && (
          <div className="empty-list">waiting for traces...</div>
        )}

        {traces.map(trace => (
          <TraceRow
            key={trace.traceId}
            trace={trace}
            active={selected?.traceId === trace.traceId}
            onClick={() => onSelect(trace.traceId)}
          />
        ))}
      </div>
    </div>
  )
}

function TraceRow({ trace, active, onClick }) {
  const time = new Date(trace.startMs).toLocaleTimeString()

  return (
    <div className={`trace-row ${active ? 'active' : ''} ${trace.hasError ? 'has-error' : ''}`} onClick={onClick}>
      <div className="trace-row-top">
        <span className={`dot ${trace.hasError ? 'err' : 'ok'}`} />
        <span className="trace-name">{trace.rootName}</span>
        <span className="trace-dur">{trace.durationMs}ms</span>
      </div>
      <div className="trace-row-meta">
        <span className="trace-service">{trace.service}</span>
        <span className="trace-spans">{trace.spanCount} spans</span>
        <span className="trace-time">{time}</span>
      </div>
    </div>
  )
}