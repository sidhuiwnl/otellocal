import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { trace, context, SpanStatusCode } from '@opentelemetry/api'

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
})

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'api-gateway',   // ← this service is api-gateway
  }),
  traceExporter: exporter,
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': {
      requestHook: (span, req) => {
        // Give spans proper names instead of just "GET"
        if (req.url) span.updateName(`${req.method} ${req.url}`)
      },
    },
  })],
})

sdk.start()

// Export tracer so app.js can create manual spans
export const tracer = trace.getTracer('api-gateway')

process.on('SIGTERM', () => sdk.shutdown())
process.on('SIGINT',  () => sdk.shutdown())