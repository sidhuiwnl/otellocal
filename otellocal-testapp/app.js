import { sdk, tracer } from './tracing.js'
import express from 'express'
import { SpanStatusCode, context, trace } from '@opentelemetry/api'

const app = express()
app.use(express.json())

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Simulate calling a downstream service ─────────────────────────────
// In real life this would be an HTTP call to another process.
// Here we create a child span with a different service.name attribute
// so the graph builder sees it as a cross-service call.

function simulateServiceCall(parentSpan, serviceName, operationName, durationMs, errorRate = 0) {
  return new Promise(async (resolve, reject) => {
    const childTracer = trace.getTracer(serviceName)
    const ctx = trace.setSpan(context.active(), parentSpan)

    await context.with(ctx, async () => {
      const span = childTracer.startSpan(operationName, {
        attributes: {
          'service.name': serviceName,
          'peer.service':  serviceName,
        }
      })

      await sleep(durationMs + Math.random() * durationMs * 0.3)

      if (Math.random() < errorRate) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `${serviceName} error` })
        span.end()
        reject(new Error(`${serviceName} failed`))
        return
      }

      span.setStatus({ code: SpanStatusCode.OK })
      span.end()
      resolve()
    })
  })
}

// ── Routes ────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Calls user-service
app.get('/api/users/:id', async (req, res) => {
  const span = trace.getActiveSpan()
  try {
    await simulateServiceCall(span, 'user-service', 'user.getById', 25)
    await simulateServiceCall(span, 'cache-service', 'cache.get', 5)
    res.json({ id: req.params.id, name: 'Alice' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Calls order-service which calls payment-service
app.post('/api/orders', async (req, res) => {
  const span = trace.getActiveSpan()
  try {
    await simulateServiceCall(span, 'user-service',    'user.validate',      20)
    await simulateServiceCall(span, 'order-service',   'order.create',       40)
    await simulateServiceCall(span, 'payment-service', 'payment.charge',     80, 0.1)
    await simulateServiceCall(span, 'email-service',   'email.sendReceipt',  30)
    res.status(201).json({ orderId: `ord-${Date.now()}` })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Calls catalog-service with higher error rate
app.get('/api/products', async (req, res) => {
  const span = trace.getActiveSpan()
  try {
    await simulateServiceCall(span, 'catalog-service', 'catalog.list', 35, 0.15)
    res.json({ products: [{ id: 1, name: 'Widget' }] })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Calls multiple services — best for seeing a rich graph
app.get('/api/reports', async (req, res) => {
  const span = trace.getActiveSpan()
  try {
    await simulateServiceCall(span, 'user-service',    'user.list',          30)
    await simulateServiceCall(span, 'order-service',   'order.aggregate',   180)
    await simulateServiceCall(span, 'analytics-service','analytics.compute', 220)
    res.json({ report: 'done' })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

app.listen(3000, () => {
  console.log('[testapp] http://localhost:3000')
  console.log('\nhit these to populate the graph:\n')
  console.log('  curl http://localhost:3000/api/users/1')
  console.log('  curl -X POST http://localhost:3000/api/orders')
  console.log('  curl http://localhost:3000/api/products')
  console.log('  curl http://localhost:3000/api/reports')
})