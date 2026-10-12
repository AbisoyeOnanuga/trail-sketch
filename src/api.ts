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

export async function searchPlaces(query: string): Promise<Location[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
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

export async function loadPlace(latitude: number, longitude: number): Promise<PlaceDetails> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  })
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

export async function requestNarration(spokenScript: string): Promise<Blob> {
  const response = await fetch('/api/narrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spokenScript }),
  })
  if (!response.ok) throw new Error(await readError(response))
  return response.blob()
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

export const errorCopy: Record<string, string> = {
  missing_gemma_key: 'The live study needs a Gemma key on the server. This sheet is a sample.',
  missing_elevenlabs_key: 'Narration needs an ElevenLabs key on the server.',
  gemma_rejected: 'Gemma refused the key. Check GEMMA_API_KEY.',
  elevenlabs_rejected: 'ElevenLabs refused the key. Check ELEVENLABS_API_KEY.',
  gemma_failed: 'Gemma did not answer. Try the study again.',
  elevenlabs_failed: 'The reading did not come back. Try again.',
  card_unreadable: 'The study came back in a shape the sheet could not use.',
  geocode_failed: 'The place name could not be looked up.',
  nearby_failed: 'The area lookup did not answer. Search a place, or try again.',
  invalid_radius: 'That distance is outside the walk and the hike.',
  rate_limited: 'Too many studies in a short while. Wait a minute.',
  request_failed: 'The trail connection dropped.',
  query_too_short: 'Type a little more of the place name.',
  invalid_coordinates: 'That point is not a real location.',
}
