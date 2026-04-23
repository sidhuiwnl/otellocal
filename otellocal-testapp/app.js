import './tracing.js'  // must be first import
import express from 'express'

const app  = express()
app.use(express.json())

// ── simulate async work ───────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fakeDbQuery(query) {
  // simulate variable DB latency
  await sleep(20 + Math.random() * 80)
  return { rows: [{ id: 1, name: 'Alice' }], query }
}

async function fakeCacheGet(key) {
  await sleep(2 + Math.random() * 8)
  // 40% cache hit rate
  return Math.random() > 0.6 ? { hit: true, value: 'cached-data' } : { hit: false }
}

async function fakeExternalCall(service) {
  await sleep(30 + Math.random() * 120)
  if (Math.random() < 0.08) throw new Error(`${service} timeout`)
  return { ok: true, service }
}

// ── routes ────────────────────────────────────────────────────────────

// Simple fast route — shows as a clean short trace
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() })
})

// Route with DB query — you'll see the db span in otellocal
app.get('/api/users/:id', async (req, res) => {
  const cache = await fakeCacheGet(`user:${req.params.id}`)
  if (cache.hit) {
    return res.json({ source: 'cache', user: cache.value })
  }
  const result = await fakeDbQuery(`SELECT * FROM users WHERE id = ${req.params.id}`)
  res.json({ source: 'db', user: result.rows[0] })
})

// Route with multiple child operations — rich trace with many spans
app.post('/api/orders', async (req, res) => {
  try {
    // these run sequentially — you'll see them stacked in the timeline
    await fakeDbQuery('SELECT * FROM users WHERE id = $1')
    await fakeCacheGet('inventory:item-42')
    await fakeDbQuery('INSERT INTO orders (user_id, item_id) VALUES ($1, $2)')
    await fakeExternalCall('payment-service')
    await fakeExternalCall('email-service')

    res.status(201).json({ orderId: `ord-${Date.now()}`, status: 'created' })
  } catch (err) {
    // this will show as an error trace in otellocal — red dot in sidebar
    res.status(503).json({ error: err.message })
  }
})

// Route that sometimes errors — generates error traces
app.get('/api/products', async (req, res) => {
  try {
    await fakeCacheGet('products:all')
    await fakeExternalCall('catalog-service')
    res.json({ products: [{ id: 1, name: 'Widget' }] })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Slow route — will show as a wide bar in the flame graph
app.get('/api/reports', async (req, res) => {
  await fakeDbQuery('SELECT * FROM orders JOIN users ...')
  await sleep(200 + Math.random() * 300)  // intentionally slow
  await fakeDbQuery('SELECT COUNT(*) FROM events WHERE ...')
  res.json({ report: 'generated', rows: 1024 })
})

app.listen(3000, () => {
  console.log('[testapp] running on http://localhost:3000')
  console.log('[testapp] hit these routes to generate real traces:\n')
  console.log('  curl http://localhost:3000/api/health')
  console.log('  curl http://localhost:3000/api/users/42')
  console.log('  curl http://localhost:3000/api/products')
  console.log('  curl http://localhost:3000/api/reports')
  console.log('  curl -X POST http://localhost:3000/api/orders')
})