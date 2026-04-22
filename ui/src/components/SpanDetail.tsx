type SpanStatus = {
  code?: number
}

type Span = {
  spanId: string
  parentSpanId?: string | null
  name: string
  durationMs: number
  service?: string
  status?: SpanStatus
  attributes?: Record<string, unknown>
}

type Trace = {
  traceId: string
  spans?: Span[]
}

type SpanDetailProps = {
  trace: Trace
}

export default function SpanDetail({ trace }: SpanDetailProps) {
  if (!trace.spans?.length) {
    return <div className="empty-state">loading spans...</div>
  }

  return (
    <div className="span-detail">
      {trace.spans.map(span => (
        <SpanBlock key={span.spanId} span={span} />
      ))}
    </div>
  )
}

function SpanBlock({ span }: { span: Span }) {
  const attrs = Object.entries(span.attributes ?? {})
  const isError = span.status?.code === 2

  return (
    <div className={`span-block ${isError ? 'is-error' : ''}`}>
      <div className="span-block-header">
        <span className="span-block-name">{span.name}</span>
        <span className="span-block-dur">{span.durationMs}ms</span>
        {isError && <span className="error-badge">ERROR</span>}
      </div>

      <div className="span-block-meta">
        <span>id: {span.spanId.slice(0, 16)}</span>

        {span.parentSpanId && (
          <span>parent: {span.parentSpanId.slice(0, 16)}</span>
        )}

        <span>service: {span.service ?? 'unknown'}</span>
      </div>

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
    </div>
  )
}