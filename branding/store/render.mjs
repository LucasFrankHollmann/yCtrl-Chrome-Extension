// Renders a store screenshot from the real popup build.
//
// Serves dist/ over http, because ES modules will not load from file://, and drops
// the shot page in beside popup.js so its relative imports resolve. Drives Chrome
// over the DevTools Protocol rather than --screenshot: the page is React polling on
// a timer, so the shot has to wait for it to signal readiness (document.title).
//
//   node render.mjs [shotName] [outPath] [width] [height]
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile, writeFile, copyFile, rm, mkdtemp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'

const here = import.meta.dirname
const dist = resolve(here, '..', '..', 'dist')
const shot = process.argv[2] ?? 'shot'
const out = process.argv[3] ?? join(here, `${shot}.png`)
const width = Number(process.argv[4] ?? 1280)
const height = Number(process.argv[5] ?? 800)

const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find((p) => existsSync(p))
if (!chromePath) throw new Error('Chrome not found')

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'
}

// --- static server ---------------------------------------------------------
await copyFile(join(here, `${shot}.html`), join(dist, '_shot.html'))

const server = createServer(async (req, res) => {
  const file = resolve(dist, '.' + decodeURIComponent(req.url.split('?')[0]))
  if (!file.startsWith(resolve(dist))) { res.writeHead(403).end(); return }
  // Read before writing the head, so a miss can still answer 404.
  let body
  try { body = await readFile(file) } catch { res.writeHead(404).end('not found'); return }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(body)
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const pageUrl = `http://127.0.0.1:${server.address().port}/_shot.html`

// --- chrome ----------------------------------------------------------------
const profile = await mkdtemp(join(tmpdir(), 'ytov-shot-'))
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] })

// The chosen port is only announced on stderr, since 0 was requested.
const wsUrl = await new Promise((ok, fail) => {
  let buf = ''
  const timer = setTimeout(() => fail(new Error('chrome did not announce a debugger port')), 30000)
  chrome.stderr.on('data', (chunk) => {
    buf += chunk
    const match = buf.match(/ws:\/\/[^\s]+/)
    if (match) { clearTimeout(timer); ok(match[0]) }
  })
  chrome.on('exit', (code) => { clearTimeout(timer); fail(new Error(`chrome exited: ${code}`)) })
})

const ws = new WebSocket(wsUrl)
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error('devtools socket failed')) })

let nextId = 0
const pending = new Map()
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  const waiter = pending.get(msg.id)
  if (!waiter) return
  pending.delete(msg.id)
  msg.error ? waiter.fail(new Error(msg.error.message)) : waiter.ok(msg.result)
}
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
  const id = ++nextId
  pending.set(id, { ok, fail })
  ws.send(JSON.stringify({ id, method, params, sessionId }))
})

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })

  await send('Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: false }, sessionId)
  await send('Page.enable', {}, sessionId)
  await send('Page.navigate', { url: pageUrl }, sessionId)

  // The page sets its title once the popup carries real state and the callouts
  // are placed. Polling that beats guessing a delay.
  const deadline = Date.now() + 30000
  for (;;) {
    const { result } = await send('Runtime.evaluate',
      { expression: 'document.title', returnByValue: true }, sessionId)
    if (result.value === 'ready') break
    if (Date.now() > deadline) throw new Error(`page never signalled ready (title: ${result.value})`)
    await new Promise((r) => setTimeout(r, 150))
  }

  const { data } = await send('Page.captureScreenshot',
    { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: true }, sessionId)
  await writeFile(out, Buffer.from(data, 'base64'))

  // Surface anything the page complained about, e.g. a callout that missed.
  const { result: warnings } = await send('Runtime.evaluate',
    { expression: 'JSON.stringify(window.__warnings || [])', returnByValue: true }, sessionId)
  const list = JSON.parse(warnings.value)
  if (list.length) console.log('page warnings:', list)

  console.log('wrote', out, `${width}x${height}`)
} finally {
  ws.close()
  chrome.kill()
  server.close()
  await rm(join(dist, '_shot.html'), { force: true })
  // Chrome releases its profile lock a moment after kill(), so a failure here is
  // just a leftover temp dir and must not mask the render result.
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }).catch(() => {})
}
