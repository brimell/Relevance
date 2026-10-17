import express, { type ErrorRequestHandler } from 'express'

const DEFAULT_PORT = 3001
const DEFAULT_BOT_API_URL = 'http://localhost:8000'
const DEFAULT_BOT_API_TIMEOUT_MS = 75_000

function getBotApiUrl(value: string | undefined): URL {
  const url = new URL(value ?? DEFAULT_BOT_API_URL)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('BOT_API_URL must use http or https')
  }

  return url
}

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  maximum: number,
): number {
  if (value === undefined) return fallback

  const parsedValue = Number(value)
  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`)
  }
  return parsedValue
}

const app = express()
const port = getPositiveInteger(process.env.PORT, DEFAULT_PORT, 'PORT', 65_535)
const botApiTimeoutMs = getPositiveInteger(
  process.env.BOT_API_TIMEOUT_MS,
  DEFAULT_BOT_API_TIMEOUT_MS,
  'BOT_API_TIMEOUT_MS',
  120_000,
)
const botApiUrl = getBotApiUrl(process.env.BOT_API_URL)

app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'relevance-web',
    botApi: botApiUrl.origin,
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/v1', async (request, response) => {
  try {
    const upstreamUrl = new URL(request.originalUrl, botApiUrl)
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        Accept: 'application/json',
        ...(request.is('application/json') ? { 'Content-Type': 'application/json' } : {}),
      },
      body: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : JSON.stringify(request.body),
      signal: AbortSignal.timeout(botApiTimeoutMs),
    })
    const body = await upstreamResponse.text()
    const contentType = upstreamResponse.headers.get('content-type')

    if (contentType) response.setHeader('Content-Type', contentType)
    response.status(upstreamResponse.status).send(body)
  } catch (error) {
    console.error('Bot API request failed', error)
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    response.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? 'The bot API timed out while processing the request.'
        : 'The bot API is unavailable. Check BOT_API_URL and the upstream service.',
    })
  }
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
}

app.use(errorHandler)

app.listen(port, () => {
  console.log(`Relevance server listening on http://localhost:${port}`)
})
