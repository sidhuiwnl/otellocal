/**
 * graph.js — builds a service dependency graph from span data
 *
 * Scans all traces in the store and derives:
 *   nodes — one per unique service name
 *   edges — one per unique caller → callee pair
 *
 * Each edge tracks:
 *   - call count
 *   - error count
 *   - average latency
 *   - p95 latency
 *
 * This runs on-demand (when the UI requests /api/graph)
 * rather than incrementally, which keeps the logic simple.
 * Fast enough for local dev — 200 traces takes < 5ms.
 */

/**
 * Build graph from the raw traces map.
 * Pass store._traces directly (we expose a method on store for this).
 */


/**
 * Trace Example
 * {
  traceId: "abc123",
  spans: [
    {
      spanId: "1",
      name: "GET /login",
      service: "frontend",
      durationMs: 50
    },
    {
      spanId: "2",
      parentSpanId: "1",
      name: "POST /auth",
      service: "api",
      durationMs: 120
    },
    {
      spanId: "3",
      parentSpanId: "2",
      name: "db.query",
      service: "database",
      durationMs: 80
    }
  ]
}
 */

export function buildGraph(traces){
    // node key  → { id, service, spanCount, errorCount }

    const nodes = new Map();

    // edge key  → { source, target, count, errors, durations[] }

    const edges = new Map();

    for(const trace of traces){
        const span = trace.spans ?? [];

        const spanId = new Map();

        for(const span of spans) spanId.set(span.spanId,span)
        
        for(const span of spans){
            if(!nodes.has(span.service)){
                nodes.set(span.service,{
                    id :  span.service,
                    service:    span.service,
                    spanCount:  0,
                    errorCount: 0,
                })
            }

            const node = nodes.get(span.service);
            node.spanCount ++;

            if (span.status?.code === 2) node.errorCount++;


            if(span.parentSpanId){
                const parent = spanId.get(span.parentSpanId);

                if(parent && parent.service !== span.service){
                    const edgeKey = `${parent.service} -> ${span.service}`


                    if(!edges.has(edgeKey)){
                         edges.set(edgeKey, {
                            source:    parent.service,
                            target:    span.service,
                            count:     0,
                            errors:    0,
                            durations: [],
                        })
                    }

                    const edge = edges.get(edgeKey)
                    edge.count++
                    edge.durations.push(span.durationMs)
                    if (span.status?.code === 2) edge.errors++
                }
            }
        }    

        
    }

    const edgeList = [...edges.values()].map(e => ({
        source:      e.source,
        target:      e.target,
        count:       e.count,
        errors:      e.errors,
        errorRate:   e.count > 0 ? Math.round(e.errors / e.count * 100) : 0,
        avgMs:       Math.round(e.durations.reduce((a, b) => a + b, 0) / e.durations.length),
        p95Ms:       calcP95(e.durations),
    }))

    return {
    nodes: [...nodes.values()],
    edges: edgeList,
  }

}

function calcP95(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1]
}