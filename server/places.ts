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

export async function reverseName(latitude: number, longitude: number): Promise<string> {
  const data = (await nominatim('/reverse', {
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
  })) as { name?: string; display_name?: string }
  const raw = data.name || data.display_name?.split(',')[0] || 'This spot'
  return oneLine(raw) || 'This spot'
}

export async function searchPlaces(query: string): Promise<Location[]> {
  const data = (await nominatim('/search', {
    format: 'jsonv2',
    q: query,
    limit: '5',
  })) as Array<{ lat?: string; lon?: string; display_name?: string; name?: string }>

  const results: Location[] = []
  for (const item of data) {
    const parsed = locationSchema.safeParse({
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      name: oneLine(item.name || item.display_name?.split(',')[0] || query),
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

export async function weatherLine(latitude: number, longitude: number): Promise<string> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'temperature_2m,cloud_cover,wind_speed_10m,weather_code')
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
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
