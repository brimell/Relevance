import express, { type ErrorRequestHandler } from 'express'

const DEFAULT_PORT = 3001
const DEFAULT_BOT_API_URL = 'http://localhost:8000'

function getBotApiUrl(value: string | undefined): URL {
  const url = new URL(value ?? DEFAULT_BOT_API_URL)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('BOT_API_URL must use http or https')
  }

  return url
}

function getPort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT
  }

  const parsedPort = Number(value)

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return parsedPort
}

const app = express()
const port = getPort(process.env.PORT)
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
      headers: request.is('application/json') ? { 'Content-Type': 'application/json' } : undefined,
      body: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : JSON.stringify(request.body),
      signal: AbortSignal.timeout(15_000),
    })
    const body = await upstreamResponse.text()
    const contentType = upstreamResponse.headers.get('content-type')

    if (contentType) response.setHeader('Content-Type', contentType)
    response.status(upstreamResponse.status).send(body)
  } catch (error) {
    console.error('Bot API request failed', error)
    response.status(502).json({
      error: 'The bot API is unavailable. Start it on port 8000 or set BOT_API_URL.',
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
