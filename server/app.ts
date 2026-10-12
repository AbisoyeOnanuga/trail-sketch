import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { fieldCardRequestSchema } from '../shared/contract.ts'
import { observeWeather, writeFieldCard } from './gemma.ts'
import { allowRequest, clientKey } from './limit.ts'
import { narrate } from './narrate.ts'
import { googleClientId, verifyGoogleIdToken } from './google.ts'
import { nearbyStudies } from './nearby.ts'
import { reverseName, searchPlaces, weatherLine } from './places.ts'

const errorStatus: Record<string, 400 | 401 | 429 | 500 | 502 | 503> = {
  missing_gemma_key: 503,
  missing_elevenlabs_key: 503,
  gemma_rejected: 401,
  elevenlabs_rejected: 401,
  gemma_failed: 502,
  gemma_rate_limited: 429,
  elevenlabs_failed: 502,
  card_unreadable: 502,
  gemma_base_url_rejected: 500,
  geocode_failed: 502,
  missing_google_client: 503,
  google_rejected: 401,
  invalid_google_token: 400,
  nearby_failed: 502,
  voice_rejected: 500,
  empty_script: 400,
  rate_limited: 429,
}

function fail(error: unknown): { status: 400 | 401 | 429 | 500 | 502 | 503; body: { error: string } } {
  const code = error instanceof Error ? error.message : 'request_failed'
  const status = errorStatus[code] ?? 500
  return { status, body: { error: code in errorStatus ? code : 'request_failed' } }
}

export function createApp(): Hono {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))

  app.get('/api/auth/config', (c) => c.json({ googleClientId: googleClientId() }))

  app.post('/api/auth/google', async (c) => {
    const key = `google:${clientKey(c.req.header('x-forwarded-for'))}`
    if (!allowRequest(key, 10, 60_000)) return c.json({ error: 'rate_limited' }, 429)
    const body = (await c.req.json().catch(() => null)) as { credential?: unknown } | null
    const credential = typeof body?.credential === 'string' ? body.credential : ''
    try {
      const profile = await verifyGoogleIdToken(credential)
      return c.json(profile)
    } catch (error) {
      const failed = fail(error)
      return c.json(failed.body, failed.status)
    }
  })

  app.get('/api/search', async (c) => {
    const query = (c.req.query('q') ?? '').replace(/[^\p{L}\p{N}\s,'./-]/gu, '').trim().slice(0, 80)
    if (query.length < 2) return c.json({ error: 'query_too_short' }, 400)
    const key = `search:${clientKey(c.req.header('x-forwarded-for'))}`
    if (!allowRequest(key, 20, 60_000)) return c.json({ error: 'rate_limited' }, 429)
    try {
      const results = await searchPlaces(query)
      return c.json({ results })
    } catch (error) {
      const failed = fail(error)
      return c.json(failed.body, failed.status)
    }
  })

  app.get('/api/nearby', async (c) => {
    const latitude = Number(c.req.query('latitude'))
    const longitude = Number(c.req.query('longitude'))
    const radius = Number(c.req.query('radius'))
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return c.json({ error: 'invalid_coordinates' }, 400)
    }
    if (!Number.isInteger(radius) || radius < 400 || radius > 15000) {
      return c.json({ error: 'invalid_radius' }, 400)
    }
    const key = `nearby:${clientKey(c.req.header('x-forwarded-for'))}`
    if (!allowRequest(key, 10, 60_000)) return c.json({ error: 'rate_limited' }, 429)
    try {
      const studies = await nearbyStudies(latitude, longitude, radius)
      return c.json({ studies })
    } catch (error) {
      const failed = fail(error)
      return c.json(failed.body, failed.status)
    }
  })

  app.get('/api/place', async (c) => {
    const latitude = Number(c.req.query('latitude'))
    const longitude = Number(c.req.query('longitude'))
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return c.json({ error: 'invalid_coordinates' }, 400)
    }
    const key = `place:${clientKey(c.req.header('x-forwarded-for'))}`
    if (!allowRequest(key, 30, 60_000)) return c.json({ error: 'rate_limited' }, 429)
    try {
      const [name, sky] = await Promise.all([
        reverseName(latitude, longitude),
        weatherLine(latitude, longitude).catch(() => 'Weather is unread from here'),
      ])
      return c.json({ name, weatherLine: sky, latitude, longitude })
    } catch (error) {
      const failed = fail(error)
      return c.json(failed.body, failed.status)
    }
  })

  app.post('/api/field-card', async (c) => {
    const key = `card:${clientKey(c.req.header('x-forwarded-for'))}`
    if (!allowRequest(key, 12, 10 * 60_000)) return c.json({ error: 'rate_limited' }, 429)
    const length = Number(c.req.header('content-length') ?? 0)
    if (length > 4000) return c.json({ error: 'payload_too_large' }, 413)
    const parsed = fieldCardRequestSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return c.json({ error: 'invalid_request' }, 400)
    try {
      const sky = await observeWeather(parsed.data.latitude, parsed.data.longitude)
      const card = await writeFieldCard(parsed.data, sky)
      return c.json(card)
    } catch (error) {
      const failed = fail(error)
      return c.json(failed.body, failed.status)
    }
  })

  app.post('/api/narrate', async (c) => {
    const key = `voice:${clientKey(c.req.header('x-forwarded-for'))}`
    if (!allowRequest(key, 8, 10 * 60_000)) return c.json({ error: 'rate_limited' }, 429)
    const body = (await c.req.json().catch(() => null)) as { spokenScript?: unknown } | null
    const spokenScript = typeof body?.spokenScript === 'string' ? body.spokenScript : ''
    try {
      const audio = await narrate(spokenScript)
      return c.body(audio, 200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      })
    } catch (error) {
      const failed = fail(error)
      return c.json(failed.body, failed.status)
    }
  })

  if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === '1') {
    app.use('*', serveStatic({ root: './dist' }))
    app.get('*', serveStatic({ path: './dist/index.html' }))
  }

  return app
}
