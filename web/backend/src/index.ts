import express, { type ErrorRequestHandler } from 'express'

const DEFAULT_PORT = 3001

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

app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'relevance-web',
    timestamp: new Date().toISOString(),
  })
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
