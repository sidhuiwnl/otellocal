/**
 * log-parser.js — extract log records from OTLP/logs payload
 *
 * OTLP log structure:
 *   ExportLogsServiceRequest
 *     └─ resourceLogs[]
 *          └─ scopeLogs[]
 *               └─ logRecords[]
 *
 * We extract each log record and attach the traceId/spanId
 * so it can be correlated to a span in the store.
 */

export function extractLogs(raw) {
  const logs = []

  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString('utf8'))
    const resourceLogs = body.resourceLogs ?? body.resource_logs ?? []

    for (const rl of resourceLogs) {
      const service = getAttr(rl.resource?.attributes, 'service.name') ?? 'unknown'
      const scopeLogs = rl.scopeLogs ?? rl.scope_logs ?? rl.instrumentationLibraryLogs ?? []

      for (const sl of scopeLogs) {
        for (const record of (sl.logRecords ?? sl.log_records ?? [])) {
          const traceId = toHex(record.traceId ?? record.trace_id)
          const spanId  = toHex(record.spanId  ?? record.span_id)
          if (!traceId) continue  // ignore logs with no trace context

          logs.push({
            traceId,
            spanId:     spanId || null,
            service,
            timestampMs: record.timeUnixNano
              ? Number(BigInt(record.timeUnixNano) / 1_000_000n)
              : Date.now(),
            severityText: record.severityText ?? 'INFO',
            severityNumber: record.severityNumber ?? 9,
            body:  record.body?.stringValue ?? String(record.body ?? ''),
            attributes: flattenAttrs(record.attributes ?? []),
          })
        }
      }
    }
  } catch (err) {
    console.error('[log-parser] parse error:', err.message)
  }

  return logs
}

function getAttr(attrs, key) {
  if (!attrs) return null
  const entry = attrs.find(a => a.key === key)
  if (!entry) return null
  const v = entry.value
  return v?.stringValue ?? v?.intValue ?? v?.doubleValue ?? null
}

function flattenAttrs(attrs) {
  const out = {}
  for (const a of attrs ?? []) {
    const v = a.value
    out[a.key] = v?.stringValue ?? v?.intValue ?? v?.doubleValue ?? v?.boolValue ?? ''
  }
  return out
}

function toHex(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    if (/^[0-9a-f]+$/i.test(value)) return value.toLowerCase()
    try { return Buffer.from(value, 'base64').toString('hex') } catch (_) {}
    return value
  }
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex')
  }
  return String(value)
}