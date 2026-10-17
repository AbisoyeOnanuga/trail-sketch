const USER_AGENT = 'TrailSketch/0.1 (plein-air field guide)'
const SIZE = 8
const SPAN = 0.02
const cache = new Map<string, { at: number; elevation: number[] }>()
const TTL = 6 * 60 * 60_000

export async function terrainGrid(latitude: number, longitude: number): Promise<number[] | null> {
  const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.elevation

  const latitudes: number[] = []
  const longitudes: number[] = []
  const lonSpan = SPAN / Math.max(0.35, Math.cos((latitude * Math.PI) / 180))
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      latitudes.push(latitude - SPAN / 2 + (y / (SIZE - 1)) * SPAN)
      longitudes.push(longitude - lonSpan / 2 + (x / (SIZE - 1)) * lonSpan)
    }
  }

  const url = new URL('https://api.open-meteo.com/v1/elevation')
  url.searchParams.set('latitude', latitudes.join(','))
  url.searchParams.set('longitude', longitudes.join(','))
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    return null
  }
  if (!response.ok) return null
  const data = (await response.json()) as { elevation?: unknown }
  const elevation = Array.isArray(data.elevation) ? data.elevation.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) : []
  if (elevation.length !== SIZE * SIZE) return null
  if (cache.size >= 40) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), elevation })
  return elevation
}
