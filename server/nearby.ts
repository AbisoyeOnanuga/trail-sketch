import { distanceMeters, portraitFor, studySchema, type Study, type StudyKind } from '../shared/studies.ts'

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const USER_AGENT = 'TrailSketch/0.1 (plein-air field guide)'

type Tags = Record<string, string>

type OverpassElement = {
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Tags
}

const cache = new Map<string, { at: number; studies: Study[] }>()

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function kindOf(tags: Tags): StudyKind {
  if (tags.waterway || tags.natural === 'water' || tags.natural === 'coastline' || tags.water || tags.natural === 'beach') {
    return 'water'
  }
  if (tags.tourism === 'viewpoint') return 'viewpoint'
  if (tags.natural === 'peak' || tags.natural === 'ridge') return 'hill'
  if (
    tags.place === 'square' ||
    tags.tourism === 'attraction' ||
    tags.man_made === 'tower' ||
    tags.man_made === 'bridge' ||
    tags.historic ||
    tags.building ||
    tags.amenity === 'place_of_worship'
  ) {
    return 'architecture'
  }
  return 'park'
}

function placeName(tags: Tags, kind: StudyKind): string {
  const named = oneLine(tags.name || tags['name:en'] || '').slice(0, 80)
  if (named) return named
  if (kind === 'water') return 'Open water'
  if (kind === 'viewpoint') return 'A viewpoint'
  if (kind === 'hill') return 'A ridge'
  if (kind === 'architecture') return 'A structure'
  return 'A green'
}

function isPublic(tags: Tags): boolean {
  if (tags.access === 'private' || tags.access === 'no') return false
  if (tags.military) return false
  return true
}

function point(element: OverpassElement): { latitude: number; longitude: number } | null {
  const latitude = element.lat ?? element.center?.lat
  const longitude = element.lon ?? element.center?.lon
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180) return null
  return { latitude: latitude!, longitude: longitude! }
}

async function overpass(query: string): Promise<OverpassElement[]> {
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(12_000),
      })
      if (response.ok) {
        const payload = (await response.json()) as { elements?: OverpassElement[] }
        return Array.isArray(payload.elements) ? payload.elements : []
      }
      if (response.status < 500 && response.status !== 429) continue
    } catch {
      // The next public server gets one try. A wide search must not stall the list.
    }
  }
  throw new Error('nearby_failed')
}

export async function nearbyStudies(latitude: number, longitude: number, radius: number): Promise<Study[]> {
  const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${radius}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.studies

  const around = `${Math.round(radius)},${latitude},${longitude}`
  const nearWays = `${Math.round(Math.min(radius, 4500))},${latitude},${longitude}`
  const query = `[out:json][timeout:12];(
node(around:${around})["name"]["tourism"="viewpoint"];
node(around:${around})["name"]["historic"="monument"];
node(around:${around})["name"]["amenity"="place_of_worship"];
node(around:${around})["name"]["man_made"="tower"];
node(around:${around})["name"]["place"="square"];
way(around:${nearWays})["name"]["leisure"="park"];
way(around:${nearWays})["name"]["leisure"="garden"];
way(around:${nearWays})["name"]["natural"="water"];
way(around:${nearWays})["name"]["natural"="beach"];
);out center 36;`

  const elements = await overpass(query)
  const studies: Study[] = []
  const seen = new Set<string>()
  for (const element of elements) {
    const tags = element.tags ?? {}
    if (!isPublic(tags)) continue
    const at = point(element)
    if (!at) continue
    const kind = kindOf(tags)
    const name = placeName(tags, kind)
    if (/edge walk|via ferrata|bungee|climb the/i.test(name)) continue
    const stamp = `${name.toLowerCase()}:${kind}`
    if (seen.has(stamp)) continue
    seen.add(stamp)
    const portrait = portraitFor(kind)
    const study = {
      id: `${kind.slice(0, 4)}-${Math.round(at.latitude * 1000)}-${Math.round(at.longitude * 1000)}`.slice(0, 40),
      name,
      longitude: at.longitude,
      latitude: at.latitude,
      distanceMeters: Math.round(distanceMeters(latitude, longitude, at.latitude, at.longitude)),
      kind,
      feel: portrait.feel,
      line: portrait.line,
    }
    const parsed = studySchema.safeParse(study)
    if (parsed.success && parsed.data.distanceMeters <= radius) studies.push(parsed.data)
  }
  studies.sort((a, b) => a.distanceMeters - b.distanceMeters)
  const balanced: Study[] = []
  const counts = new Map<string, number>()
  for (const study of studies) {
    const count = counts.get(study.kind) ?? 0
    if (count >= 3) continue
    balanced.push(study)
    counts.set(study.kind, count + 1)
    if (balanced.length >= 12) break
  }
  balanced.sort((a, b) => a.distanceMeters - b.distanceMeters)
  if (cache.size > 40) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), studies: balanced })
  return balanced
}
