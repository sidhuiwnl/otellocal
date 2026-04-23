import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

const exporter = new OTLPTraceExporter({
  // points to your otellocal collector
  url: 'http://localhost:4318/v1/traces',
})

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]:    'testapp',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: exporter,
  // auto-instruments: http, express, dns, net — zero extra code
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
console.log('[tracing] OTel SDK started → http://localhost:4318')

// Flush spans on shutdown so nothing is lost
process.on('SIGTERM', () => sdk.shutdown())
process.on('SIGINT',  () => sdk.shutdown())