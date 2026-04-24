import { useState } from 'react'

type SpanStatus = {
  code?: number
}


type SpanAnalysis = {
  isSlow?: boolean
  p95?: number
  avgMs?: number
  ratio?: number
}

type Span = {
  spanId: string
  parentSpanId?: string | null
  name: string
  startMs: number
  durationMs: number
  status?: SpanStatus
  attributes?: Record<string, unknown>
  analysis?: SpanAnalysis
}

type Trace = {
  traceId: string
  startMs: number
  durationMs: number
  spans?: Span[]
  hasError?: boolean
}

type TimelineProps = {
  trace: Trace
}

const COLORS = {
  db:    '#0F6E56',
  cache: '#3B6D11',
  http:  '#185FA5',
  rpc:   '#534AB7',
  queue: '#854F0B',
  error: '#A32D2D',
  root:  '#333331',
  other: '#555',
} as const

function spanColor(span: Span): string {
  if (span.status?.code === 2) return COLORS.error

  const n = span.name.toLowerCase()

  if (n.startsWith('db.')     || n.includes('query') || n.includes('sql'))    return COLORS.db
  if (n.startsWith('cache.')  || n.includes('redis'))                          return COLORS.cache
  if (n.startsWith('http.')   || n.includes('fetch') || n.includes('request')) return COLORS.http
  if (n.startsWith('rpc.')    || n.includes('grpc'))                           return COLORS.rpc
  if (n.startsWith('queue.')  || n.includes('publish') || n.includes('kafka')) return COLORS.queue
  if (!span.parentSpanId)                                                      return COLORS.root

  return COLORS.other
}

export default function Timeline({ trace }: TimelineProps) {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)

  if (!trace.spans || trace.spans.length === 0) {
    return <div className="empty-state">loading spans...</div>
  }

  const totalMs = trace.durationMs || 1

  const ticks = [0, 25, 50, 75, 100].map(pct => ({
    pct,
    label: Math.round((totalMs * pct) / 100) + 'ms'
  }))

  return (
    <div className="timeline">
      <div className="timeline-summary">
        <span className="tl-id">
          {trace.traceId?.slice(0, 16)}...
        </span>
        <span className="tl-meta">
          {trace.spans.length} spans · {trace.durationMs}ms total
        </span>
        {trace.hasError && <span className="error-badge">error</span>}
      </div>

      {/* Ruler */}
      <div className="tl-ruler-wrap">
        <div className="tl-label-col" />
        <div className="tl-ruler">
          {ticks.map(t => (
            <span key={t.pct} style={{ left: `${t.pct}%` }} className="tick">
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Span rows */}
      {trace.spans.map(span => {
        const leftPct  = ((span.startMs - trace.startMs) / totalMs) * 100
        const widthPct = Math.max((span.durationMs / totalMs) * 100, 0.3)
        const color    = spanColor(span)
        const isSelected = selectedSpan?.spanId === span.spanId

        return (
          // <div
          //   key={span.spanId}
          //   className={`span-row ${!span.parentSpanId ? 'is-root' : ''}`}
          //   onClick={() => setSelectedSpan(isSelected ? null : span)}
          // >
          //   <div className="span-label" title={span.name}>
          //     {span.name}
          //   </div>

          //   <div className="span-track">
          //     <div
          //       className={`span-bar ${isSelected ? 'selected' : ''}`}
          //       style={{
          //         left: `${leftPct}%`,
          //         width: `${widthPct}%`,
          //         background: color,
          //       }}
          //     >
          //       <span className="bar-dur">{span.durationMs}ms</span>
          //     </div>
          //   </div>
          // </div>

          <div
              key={span.spanId}
              className={`span-row ${!span.parentSpanId ? 'is-root' : ''}`}
              onClick={() => setSelectedSpan(isSelected ? null : span)}
            >
              <div className="span-label" title={span.name}>
                {span.analysis?.isSlow && (
                  <span className="slow-badge" title={`${span.analysis.ratio}x slower than p95 (${span.analysis.p95}ms)`}>
                    ⚠
                  </span>
                )}
                {span.name}
              </div>
              <div className="span-track">
                <div
                  className={`span-bar ${isSelected ? 'selected' : ''} ${span.analysis?.isSlow ? 'is-slow' : ''}`}
                  style={{
                    left:       `${leftPct}%`,
                    width:      `${widthPct}%`,
                    background: color,
                  }}
                >
                  <span className="bar-dur">{span.durationMs}ms</span>
                </div>
              </div>
            </div>
        )
      })}

      {/* Inline span detail */}
      {selectedSpan && (
        <div className="inline-detail">
          <SpanAttrs span={selectedSpan} />
        </div>
      )}
    </div>
  )
}

// function SpanAttrs({ span }: { span: Span }) {
//   const entries = Object.entries(span.attributes ?? {})

//   return (
//     <div className="span-attrs">
//       <div className="attrs-title">
//         {span.name} — {span.durationMs}ms
//       </div>

//       {entries.length === 0 && (
//         <div className="no-attrs">no attributes</div>
//       )}

//       <table className="attrs-table">
//         <tbody>
//           {entries.map(([k, v]) => (
//             <tr key={k}>
//               <td className="attr-key">{k}</td>
//               <td className="attr-val">{String(v)}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }

type SpanAttrsProps = {
  span: Span
}



function SpanAttrs({ span } : SpanAttrsProps) {
  const entries = Object.entries(span.attributes ?? {})
  const a = span.analysis

  return (
    <div className="span-attrs">
      <div className="attrs-title">{span.name} — {span.durationMs}ms</div>

      {/* slow span analysis block */}
      {a?.isSlow && (
        <div className="slow-analysis">
          <span className="slow-title">⚠ slow span detected</span>
          <div className="slow-stats">
            <span>this run: <strong>{span.durationMs}ms</strong></span>
            <span>p95: <strong>{a.p95}ms</strong></span>
            <span>avg: <strong>{a.avgMs}ms</strong></span>
            <span>ratio: <strong>{a.ratio}x</strong></span>
          </div>
        </div>
      )}

      {entries.length === 0 && <div className="no-attrs">no attributes</div>}
      <table className="attrs-table">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="attr-key">{k}</td>
              <td className="attr-val">{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}