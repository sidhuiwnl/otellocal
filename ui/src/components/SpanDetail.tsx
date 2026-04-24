// import { useState, useEffect } from 'react'

// export default function SpanDetail({ trace }) {
//   if (!trace.spans?.length) return <div className="empty-state">loading spans...</div>

//   // Group logs by spanId for quick lookup
//   const logsBySpan = {}
//   for (const log of trace.logs ?? []) {
//     const key = log.spanId ?? '__trace__'
//     if (!logsBySpan[key]) logsBySpan[key] = []
//     logsBySpan[key].push(log)
//   }

//   return (
//     <div className="span-detail">
//       {trace.spans.map(span => (
//         <SpanBlock
//           key={span.spanId}
//           span={span}
//           logs={logsBySpan[span.spanId] ?? []}
//         />
//       ))}
//     </div>
//   )
// }

// function SpanBlock({ span, logs }) {
//   const [open, setOpen] = useState(true)
//   const attrs   = Object.entries(span.attributes ?? {})
//   const isError = span.status?.code === 2
//   const a       = span.analysis

//   return (
//     <div className={`span-block ${isError ? 'is-error' : ''}`}>
//       <div className="span-block-header" onClick={() => setOpen(o => !o)} style={{cursor:'pointer'}}>
//         <span className="span-toggle">{open ? '▾' : '▸'}</span>
//         <span className="span-block-name">{span.name}</span>
//         <span className="span-block-dur">{span.durationMs}ms</span>
//         {isError && <span className="error-badge">ERROR</span>}
//         {a?.isSlow && <span className="warn-badge">⚠ slow</span>}
//         {logs.length > 0 && (
//           <span className="log-count-badge">{logs.length} log{logs.length > 1 ? 's' : ''}</span>
//         )}
//       </div>

//       {open && (
//         <>
//           <div className="span-block-meta">
//             <span>id: {span.spanId?.slice(0, 16)}</span>
//             {span.parentSpanId && <span>parent: {span.parentSpanId?.slice(0, 16)}</span>}
//             <span>service: {span.service}</span>
//           </div>

//           {/* slow span analysis */}
//           {a?.isSlow && (
//             <div className="slow-analysis">
//               <span className="slow-title">⚠ slow span — {a.ratio}x above p95</span>
//               <div className="slow-stats">
//                 <span>this: <strong>{span.durationMs}ms</strong></span>
//                 <span>p95: <strong>{a.p95}ms</strong></span>
//                 <span>avg: <strong>{a.avgMs}ms</strong></span>
//                 <span>samples: <strong>{a.sampleCount}</strong></span>
//               </div>
//             </div>
//           )}

//           {/* attributes */}
//           {attrs.length > 0 && (
//             <table className="attrs-table">
//               <tbody>
//                 {attrs.map(([k, v]) => (
//                   <tr key={k}>
//                     <td className="attr-key">{k}</td>
//                     <td className="attr-val">{String(v)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           )}

//           {/* correlated logs */}
//           {logs.length > 0 && (
//             <div className="correlated-logs">
//               <div className="logs-title">logs during this span</div>
//               {logs.map((log, i) => (
//                 <div key={i} className={`log-line sev-${log.severityText?.toLowerCase()}`}>
//                   <span className="log-sev">{log.severityText}</span>
//                   <span className="log-body">{log.body}</span>
//                   <span className="log-ts">
//                     {new Date(log.timestampMs).toLocaleTimeString()}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   )
// }


import { useState } from 'react'

/* ================= TYPES ================= */

type SpanStatus = {
  code?: number
}

type SpanAnalysis = {
  isSlow?: boolean
  ratio?: number
  p95?: number
  avgMs?: number
  sampleCount?: number
}

type Span = {
  spanId: string
  parentSpanId?: string | null
  name: string
  durationMs: number
  service?: string
  status?: SpanStatus
  attributes?: Record<string, unknown>
  analysis?: SpanAnalysis
}

type Log = {
  spanId?: string | null
  severityText?: string
  body?: string
  timestampMs: number
}

type Trace = {
  traceId: string
  startMs: number
  durationMs: number
  spans?: Span[]
  logs? : Log[]
  hasError?: boolean
}

type SpanDetailProps = {
  trace: Trace
}

type SpanBlockProps = {
  span: Span
  logs: Log[]
}

/* ================= COMPONENT ================= */

export default function SpanDetail({ trace }: SpanDetailProps) {
  if (!trace.spans?.length) {
    return <div className="empty-state">loading spans...</div>
  }

  // ✅ typed map
  const logsBySpan: Record<string, Log[]> = {}

  for (const log of trace.logs ?? []) {
    const key = log.spanId ?? '__trace__'
    if (!logsBySpan[key]) logsBySpan[key] = []
    logsBySpan[key].push(log)
  }

  return (
    <div className="span-detail">
      {trace.spans.map(span => (
        <SpanBlock
          key={span.spanId}
          span={span}
          logs={logsBySpan[span.spanId] ?? []}
        />
      ))}
    </div>
  )
}

/* ================= CHILD ================= */

function SpanBlock({ span, logs }: SpanBlockProps) {
  const [open, setOpen] = useState<boolean>(true)

  const attrs = Object.entries(span.attributes ?? {})
  const isError = span.status?.code === 2
  const a = span.analysis

  return (
    <div className={`span-block ${isError ? 'is-error' : ''}`}>
      <div
        className="span-block-header"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer' }}
      >
        <span className="span-toggle">{open ? '▾' : '▸'}</span>
        <span className="span-block-name">{span.name}</span>
        <span className="span-block-dur">{span.durationMs}ms</span>

        {isError && <span className="error-badge">ERROR</span>}
        {a?.isSlow && <span className="warn-badge">⚠ slow</span>}

        {logs.length > 0 && (
          <span className="log-count-badge">
            {logs.length} log{logs.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {open && (
        <>
          <div className="span-block-meta">
            <span>id: {span.spanId.slice(0, 16)}</span>
            {span.parentSpanId && (
              <span>parent: {span.parentSpanId.slice(0, 16)}</span>
            )}
            <span>service: {span.service ?? '-'}</span>
          </div>

          {/* slow span analysis */}
          {a?.isSlow && (
            <div className="slow-analysis">
              <span className="slow-title">
                ⚠ slow span — {a.ratio ?? '-'}x above p95
              </span>

              <div className="slow-stats">
                <span>this: <strong>{span.durationMs}ms</strong></span>
                <span>p95: <strong>{a.p95 ?? '-'}ms</strong></span>
                <span>avg: <strong>{a.avgMs ?? '-'}ms</strong></span>
                <span>samples: <strong>{a.sampleCount ?? '-'}</strong></span>
              </div>
            </div>
          )}

          {/* attributes */}
          {attrs.length > 0 && (
            <table className="attrs-table">
              <tbody>
                {attrs.map(([k, v]) => (
                  <tr key={k}>
                    <td className="attr-key">{k}</td>
                    <td className="attr-val">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* logs */}
          {logs.length > 0 && (
            <div className="correlated-logs">
              <div className="logs-title">logs during this span</div>

              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`log-line sev-${log.severityText?.toLowerCase() ?? 'unknown'}`}
                >
                  <span className="log-sev">
                    {log.severityText ?? 'UNKNOWN'}
                  </span>

                  <span className="log-body">
                    {log.body ?? ''}
                  </span>

                  <span className="log-ts">
                    {new Date(log.timestampMs).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}