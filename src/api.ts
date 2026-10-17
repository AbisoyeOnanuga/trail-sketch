import {
  fieldCardSchema,
  placeSchema,
  searchResultSchema,
  type FieldCard,
  type FieldCardRequest,
  type Location,
  type PlaceDetails,
} from '../shared/contract.ts'
import { nearbySchema, type Study } from '../shared/studies.ts'

const CACHE_KEY = 'trail-sketch.last-card'

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  return payload?.error ?? 'request_failed'
}

export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number },
): Promise<Location[]> {
  const params = new URLSearchParams({ q: query })
  if (near) {
    params.set('latitude', String(near.latitude))
    params.set('longitude', String(near.longitude))
  }
  const response = await fetch(`/api/search?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  const parsed = searchResultSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('request_failed')
  return parsed.data.results
}

export async function loadNearby(latitude: number, longitude: number, radius: number): Promise<Study[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: String(radius),
  })
  const response = await fetch(`/api/nearby?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  const parsed = nearbySchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('request_failed')
  return parsed.data.studies
}

export async function loadPlace(latitude: number, longitude: number, needName = true): Promise<PlaceDetails> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  })
  if (!needName) params.set('named', '1')
  const response = await fetch(`/api/place?${params}`)
  if (!response.ok) throw new Error(await readError(response))
  const parsed = placeSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('request_failed')
  return parsed.data
}

export async function requestFieldCard(body: FieldCardRequest): Promise<FieldCard> {
  const response = await fetch('/api/field-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(await readError(response))
  const parsed = fieldCardSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('card_unreadable')
  return parsed.data
}

const spokenClips = new Map<string, Blob>()

export async function requestNarration(spokenScript: string): Promise<Blob> {
  const key = spokenScript.trim()
  const cached = spokenClips.get(key)
  if (cached) return cached
  const response = await fetch('/api/narrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spokenScript }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const clip = await response.blob()
  if (spokenClips.size >= 6) {
    const oldest = spokenClips.keys().next().value
    if (oldest) spokenClips.delete(oldest)
  }
  spokenClips.set(key, clip)
  return clip
}

export function readCachedCard(): FieldCard | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = fieldCardSchema.safeParse(JSON.parse(raw))
    return parsed.success && parsed.data.source === 'gemma' ? parsed.data : null
  } catch {
    return null
  }
}

export function writeCachedCard(card: FieldCard): void {
  if (card.source !== 'gemma') return
  localStorage.setItem(CACHE_KEY, JSON.stringify(card))
}

export async function loadGoogleClientId(): Promise<string | null> {
  const response = await fetch('/api/auth/config')
  if (!response.ok) return null
  const payload = (await response.json()) as { googleClientId?: unknown }
  return typeof payload.googleClientId === 'string' && payload.googleClientId.length > 0
    ? payload.googleClientId
    : null
}

export async function verifyGoogle(credential: string): Promise<{ sub: string; name: string; email: string }> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (!response.ok) throw new Error(await readError(response))
  const payload = (await response.json()) as { sub?: unknown; name?: unknown; email?: unknown }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('google_rejected')
  return {
    sub: payload.sub,
    name: typeof payload.name === 'string' ? payload.name : '',
    email: typeof payload.email === 'string' ? payload.email : '',
  }
}

export const errorCopy: Record<string, string> = {
  missing_gemma_key: 'Gemma is not connected on the server.',
  missing_elevenlabs_key: 'Narration needs an ElevenLabs key on the server.',
  gemma_rejected: 'Gemma refused the server key.',
  elevenlabs_rejected: 'ElevenLabs refused the key. Check ELEVENLABS_API_KEY.',
  gemma_failed: 'Gemma did not answer.',
  gemma_rate_limited: 'Gemma is busy right now.',
  elevenlabs_failed: 'The reading did not come back. Try again.',
  card_unreadable: 'The study came back in a shape the sheet could not use.',
  geocode_failed: 'The place name could not be looked up.',
  nearby_failed: 'The area lookup did not answer. Try again in a moment.',
  missing_google_client: 'Google sign-in needs a client id on the server.',
  google_rejected: 'Google did not confirm that sign-in.',
  invalid_google_token: 'That Google sign-in could not be read.',
  invalid_radius: 'That distance is outside the reaches this map searches.',
  rate_limited: 'Too many studies in a short while. Wait a minute.',
  request_failed: 'The trail connection dropped.',
  query_too_short: 'Type a little more of the place name.',
  invalid_coordinates: 'That point is not a real location.',
}
