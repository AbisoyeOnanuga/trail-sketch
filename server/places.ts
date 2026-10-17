import { locationSchema, type Location } from '../shared/contract.ts'

const USER_AGENT = 'TrailSketch/0.1 (plein-air field guide)'
let nextNominatimAt = 0

async function nominatimSlot(): Promise<void> {
  const now = Date.now()
  const wait = Math.max(0, nextNominatimAt - now)
  nextNominatimAt = Math.max(now, nextNominatimAt) + 1100
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
}

async function nominatim(path: string, params: Record<string, string>): Promise<unknown> {
  await nominatimSlot()
  const url = new URL(path, 'https://nominatim.openstreetmap.org')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error('geocode_failed')
  }
  return response.json()
}

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

const nameCache = new Map<string, { at: number; name: string }>()
const searchCache = new Map<string, { at: number; results: Location[] }>()

export async function reverseName(latitude: number, longitude: number): Promise<string> {
  const key = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`
  const cached = nameCache.get(key)
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.name
  const name = await lookupName(latitude, longitude)
  if (name !== 'This spot') {
    if (nameCache.size >= 80) {
      const oldest = nameCache.keys().next().value
      if (oldest) nameCache.delete(oldest)
    }
    nameCache.set(key, { at: Date.now(), name })
  }
  return name
}

async function lookupName(latitude: number, longitude: number): Promise<string> {
  try {
    const url = new URL('https://photon.komoot.io/reverse')
    url.searchParams.set('lat', String(latitude))
    url.searchParams.set('lon', String(longitude))
    url.searchParams.set('limit', '1')
    url.searchParams.set('lang', 'en')
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(2500),
    })
    if (response.ok) {
      const data = (await response.json()) as {
        features?: Array<{ properties?: { name?: string; street?: string; district?: string; city?: string } }>
      }
      const props = data.features?.[0]?.properties
      const raw = oneLine(props?.name || props?.street || props?.district || props?.city || '')
      if (raw) return raw
    }
  } catch {
    // Nominatim stays the spare lookup; its one-per-second queue is shared by every visitor.
  }

  const data = (await nominatim('/reverse', {
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
  })) as { name?: string; display_name?: string }
  const raw = data.name || data.display_name?.split(',')[0] || 'This spot'
  return oneLine(raw) || 'This spot'
}

export async function searchPlaces(
  query: string,
  near?: { latitude: number; longitude: number },
): Promise<Location[]> {
  const nearKey = near ? `${near.latitude.toFixed(1)}:${near.longitude.toFixed(1)}` : 'any'
  const key = `${query.toLowerCase()}|${nearKey}`
  const cached = searchCache.get(key)
  if (cached && Date.now() - cached.at < 90_000) return cached.results
  const results = await lookupPlaces(query, near)
  if (results.length > 0) {
    if (searchCache.size >= 40) {
      const oldest = searchCache.keys().next().value
      if (oldest) searchCache.delete(oldest)
    }
    searchCache.set(key, { at: Date.now(), results })
  }
  return results
}

async function lookupPlaces(
  query: string,
  near?: { latitude: number; longitude: number },
): Promise<Location[]> {
  try {
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '5')
    url.searchParams.set('lang', 'en')
    if (near) {
      url.searchParams.set('lat', String(near.latitude))
      url.searchParams.set('lon', String(near.longitude))
    }
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const data = (await response.json()) as {
        features?: Array<{
          geometry?: { coordinates?: number[] }
          properties?: { name?: string; city?: string; state?: string; country?: string }
        }>
      }
      const results: Location[] = []
      for (const feature of data.features ?? []) {
        const [longitude, latitude] = feature.geometry?.coordinates ?? []
        const props = feature.properties ?? {}
        const place = [props.city, props.state, props.country].filter(Boolean).slice(0, 1).join('')
        const label = props.name ? (place ? `${props.name}, ${place}` : props.name) : place
        const parsed = locationSchema.safeParse({
          latitude: Number(latitude),
          longitude: Number(longitude),
          name: oneLine(label),
        })
        if (parsed.success) results.push(parsed.data)
      }
      if (results.length > 0) return results
    }
  } catch {
    // Photon is the free autocomplete index. Nominatim is the spare lookup.
  }

  const data = (await nominatim('/search', {
    format: 'jsonv2',
    q: query,
    limit: '5',
  })) as Array<{ lat?: string; lon?: string; display_name?: string; name?: string }>

  const results: Location[] = []
  for (const item of data) {
    const label = item.display_name?.split(',').slice(0, 2).join(', ') || item.name || query
    const parsed = locationSchema.safeParse({
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      name: oneLine(label),
    })
    if (parsed.success) results.push(parsed.data)
  }
  return results
}

const weatherWords: Record<number, string> = {
  0: 'clear',
  1: 'mostly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'rime fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'rain showers',
  95: 'a thunderstorm',
}

const weatherCache = new Map<string, { at: number; line: string }>()

export async function weatherLine(latitude: number, longitude: number): Promise<string> {
  const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`
  const hit = weatherCache.get(key)
  if (hit && Date.now() - hit.at < 15 * 60_000) return hit.line
  const line = await readWeather(latitude, longitude)
  if (line !== 'Weather is unread from here') {
    if (weatherCache.size > 200) {
      const oldest = weatherCache.keys().next().value
      if (oldest) weatherCache.delete(oldest)
    }
    weatherCache.set(key, { at: Date.now(), line })
  }
  return line
}

async function readWeather(latitude: number, longitude: number): Promise<string> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,cloud_cover,wind_speed_10m,weather_code')
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) return 'Weather is unread from here'
  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number
      cloud_cover?: number
      wind_speed_10m?: number
      weather_code?: number
    }
  }
  const current = data.current
  if (!current) return 'Weather is unread from here'
  const sky = weatherWords[current.weather_code ?? -1] ?? 'mixed sky'
  const wind = current.wind_speed_10m ?? 0
  const air = wind < 12 ? 'still air' : wind < 28 ? 'a working breeze' : 'wind that will fight the paper'
  const temp = Math.round(current.temperature_2m ?? 0)
  const cloud = current.cloud_cover ?? 0
  const light = cloud < 30 ? 'open light' : cloud < 70 ? 'soft light' : 'flat light'
  return `${temp}°C, ${sky}, ${light}, ${air}`.slice(0, 180)
}
