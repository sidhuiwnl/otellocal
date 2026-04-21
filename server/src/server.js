import http from 'http';
import express from 'express';
import cors from 'cors';
import { createHttpReceiver } from './http-receiver.js';
import { attachWsServer } from './ws-server.js';
import { createApiRouter } from './api.js';
import { store } from './store.js';

const OTLP_HTTP_PORT = process.env.OTLP_HTTP_PORT ?? 4318;
const API_PORT       = process.env.API_PORT       ?? 4320;
const DEMO_MODE      = process.argv.includes('--demo');

const otlpApp    = createHttpReceiver();
const otlpServer = http.createServer(otlpApp);
otlpServer.listen(OTLP_HTTP_PORT, () => {
  console.log(`[otellocal] OTLP/HTTP  :${OTLP_HTTP_PORT}`);
});

const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());
apiApp.use('/api', createApiRouter());

const apiServer = http.createServer(apiApp);
attachWsServer(apiServer);

apiServer.listen(API_PORT, () => {
  console.log(`[otellocal] API + WS   :${API_PORT}`);
  if (DEMO_MODE) {
    console.log('[otellocal] demo mode on');
    injectDemoTraces();
  }
  console.log(`\n  Set in your app:\n`);
  console.log(`  OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:${OTLP_HTTP_PORT}`);
  console.log(`  OTEL_EXPORTER_OTLP_PROTOCOL=http/json\n`);
});

function injectDemoTraces() {
  const demos = [
    ['POST /api/orders',   'order-service',  220, false],
    ['GET /api/users/42',  'user-service',    85, false],
    ['POST /api/checkout', 'order-service',  540, true ],
    ['GET /api/products',  'catalog-service', 60, false],
    ['PUT /api/cart',      'cart-service',   130, false],
  ];
  for (const [name, svc, ms, err] of demos) {
    store.ingest(makeDemoTrace(name, svc, ms, err));
  }
  setInterval(() => {
    const names = [
      'GET /api/health', 'POST /api/auth/login',
      'GET /api/orders/history', 'PATCH /api/users/profile',
    ];
    const name = names[Math.floor(Math.random() * names.length)];
    store.ingest(makeDemoTrace(name, 'api-gateway', 50 + Math.random() * 400, Math.random() < 0.1));
  }, 4000);
}

function makeDemoTrace(rootName, service, totalMs, hasError) {
  const now        = BigInt(Date.now()) * 1_000_000n;
  const traceId    = randomHex(32);
  const rootSpanId = randomHex(16);

  const spans = [{
    traceId, spanId: rootSpanId, parentSpanId: null,
    name: rootName, kind: 2,
    startTimeUnixNano: String(now),
    endTimeUnixNano:   String(now + BigInt(Math.round(totalMs)) * 1_000_000n),
    attributes: [
      { key: 'http.method',      value: { stringValue: rootName.split(' ')[0] } },
      { key: 'http.url',         value: { stringValue: rootName.split(' ')[1] ?? '/' } },
      { key: 'http.status_code', value: { stringValue: hasError ? '500' : '200' } },
    ],
    status: { code: hasError ? 2 : 1 },
    events: [],
    resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] },
  }];

  const children = [
    { name: 'db.query',         pct: 0.35, off: 0.05 },
    { name: 'cache.get',        pct: 0.10, off: 0.02 },
    { name: 'http.client.call', pct: 0.40, off: 0.45 },
  ];
  for (const c of children) {
    if (Math.random() > 0.3) {
      const start = now + BigInt(Math.round(totalMs * c.off)) * 1_000_000n;
      const dur   = BigInt(Math.round(totalMs * c.pct)) * 1_000_000n;
      spans.push({
        traceId, spanId: randomHex(16), parentSpanId: rootSpanId,
        name: c.name, kind: 3,
        startTimeUnixNano: String(start),
        endTimeUnixNano:   String(start + dur),
        attributes: [], status: { code: 1 }, events: [],
        resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] },
      });
    }
  }
  return spans;
}

function randomHex(len) {
  return [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}