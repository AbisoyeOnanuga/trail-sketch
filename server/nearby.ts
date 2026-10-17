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
  const attempts = ENDPOINTS.map(async (endpoint) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(6_000),
    })
    if (!response.ok) throw new Error('nearby_failed')
    const payload = (await response.json()) as { elements?: OverpassElement[] }
    return Array.isArray(payload.elements) ? payload.elements : []
  })
  try {
    return await Promise.any(attempts)
  } catch {
    throw new Error('nearby_failed')
  }
}

// Photon answers one request per caller at a time, so fewer, wider requests are faster than many narrow ones.
// Each group is nearest-first, so dense city tags get their own group and cannot crowd out parks, water, or lookouts.
const PHOTON_GROUPS = [
  ['leisure:park', 'leisure:garden', 'natural:water', 'natural:beach', 'natural:peak'],
  ['amenity:place_of_worship', 'historic:monument', 'historic:building', 'historic:castle', 'place:square', 'man_made:tower'],
  ['tourism:viewpoint'],
]
const PER_KIND = 6
const MAX_STUDIES = 20

type PhotonFeature = {
  geometry?: { coordinates?: number[] }
  properties?: { name?: string; osm_key?: string; osm_value?: string }
}

async function photonGroup(latitude: number, longitude: number, radius: number, tags: string[]): Promise<OverpassElement[]> {
  const url = new URL('https://photon.komoot.io/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('radius', String(Math.max(0.4, radius / 1000)))
  url.searchParams.set('limit', tags.length > 1 ? '40' : '10')
  url.searchParams.set('lang', 'en')
  for (const tag of tags) url.searchParams.append('osm_tag', tag)
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error('nearby_failed')
  const data = (await response.json()) as { features?: PhotonFeature[] }
  return (data.features ?? []).map((feature) => {
    const [lon, lat] = feature.geometry?.coordinates ?? []
    const props = feature.properties ?? {}
    const tags: Tags = { name: props.name ?? '' }
    if (props.osm_key) tags[props.osm_key] = props.osm_value ?? 'yes'
    return { lat, lon, tags }
  })
}

const WIDE_REACH = 12_000
const RING_BEARINGS = [20, 140, 260]

function destination(latitude: number, longitude: number, meters: number, bearingDeg: number): { latitude: number; longitude: number } {
  const bearing = (bearingDeg * Math.PI) / 180
  const latRad = (latitude * Math.PI) / 180
  const dLat = (meters * Math.cos(bearing)) / 111_320
  const dLon = (meters * Math.sin(bearing)) / (111_320 * Math.max(0.2, Math.cos(latRad)))
  return { latitude: latitude + dLat, longitude: longitude + dLon }
}

async function photonNearby(latitude: number, longitude: number, radius: number): Promise<OverpassElement[]> {
  const wide = radius >= WIDE_REACH
  const settled = await Promise.allSettled(
    PHOTON_GROUPS.map((tags, index) => {
      if (!wide) return photonGroup(latitude, longitude, radius, tags)
      const center = destination(latitude, longitude, radius * 0.7, RING_BEARINGS[index] ?? 0)
      return photonGroup(center.latitude, center.longitude, radius * 0.4, tags)
    }),
  )
  const elements = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  if (elements.length === 0 && settled.every((result) => result.status === 'rejected')) throw new Error('nearby_failed')
  return elements
}

function overpassQuery(latitude: number, longitude: number, radius: number): string {
  const around = `${Math.round(Math.min(radius, 4000))},${latitude},${longitude}`
  return `[out:json][timeout:6];(
node(around:${around})["name"]["tourism"="viewpoint"];
node(around:${around})["name"]["historic"="monument"];
node(around:${around})["name"]["amenity"="place_of_worship"];
node(around:${around})["name"]["place"="square"];
way(around:${around})["name"]["leisure"="park"];
way(around:${around})["name"]["natural"="water"];
);out center 36;`
}

// Six places per kind, twenty in total, for every reach.
// Here and a walk space those six from nearest to farthest.
// A hike, a ride, or a drive spends the same six on the farthest places found.
// A nearer place keeps a slot only when nothing farther was found for that kind.
function spreadAcross(sorted: Study[], radius: number): Study[] {
  if (sorted.length <= PER_KIND) return sorted
  if (radius >= WIDE_REACH) return sorted.slice(-PER_KIND)
  const last = sorted.length - 1
  const wanted: number[] = []
  for (let step = 0; step < PER_KIND; step += 1) {
    const t = step / (PER_KIND - 1)
    wanted.push(Math.round(t * last))
  }
  const picks: number[] = []
  for (const index of wanted) {
    if (!picks.includes(index)) picks.push(index)
  }
  for (let index = 0; picks.length < PER_KIND && index <= last; index += 1) {
    if (!picks.includes(index)) picks.push(index)
  }
  return picks
    .slice(0, PER_KIND)
    .sort((a, b) => a - b)
    .map((index) => sorted[index])
}

export async function nearbyStudies(latitude: number, longitude: number, radius: number): Promise<Study[]> {
  const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}:${radius}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.studies

  let elements = await photonNearby(latitude, longitude, radius).catch(() => [] as OverpassElement[])
  if (elements.length === 0) elements = await overpass(overpassQuery(latitude, longitude, radius))
  const studies: Study[] = []
  const seen = new Set<string>()
  for (const element of elements) {
    const tags = element.tags ?? {}
    if (!isPublic(tags)) continue
    const at = point(element)
    if (!at) continue
    const kind = kindOf(tags)
    if (!tags.name?.trim() && (kind === 'park' || kind === 'architecture')) continue
    const name = placeName(tags, kind)
    if (/edge walk|via ferrata|bungee|climb the|splash pad|rink|pool|public health/i.test(name)) continue
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
  const byKind = new Map<StudyKind, Study[]>()
  for (const study of studies) byKind.set(study.kind, [...(byKind.get(study.kind) ?? []), study])
  const balanced = [...byKind.values()]
    .flatMap((group) => spreadAcross(group, radius))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_STUDIES)
  if (cache.size > 40) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), studies: balanced })
  return balanced
}
