import type { StudyKind } from '../shared/studies.ts'

const cache = new Map<string, Promise<string | null>>()

// Wide places such as parks and shorelines need a wider circle than a single building.
const searchRadius: Record<StudyKind, number> = {
  architecture: 120,
  viewpoint: 250,
  water: 300,
  park: 300,
  hill: 300,
}

// Photos of people, maps, and graphics are not views of the place to paint.
const peopleWords =
  /\b(people|persons?|portraits?|men|women|boys|girls|children|faces?|selfies?|officers?|politicians?|mayors?|councillors?|actors?|actresses|musicians?|singers?|athletes?|players?|weddings?|crowds?|protests?|demonstrations?|births|deaths|headshots?)\b/i
const notAView = /\(cropped\)|portrait|headshot|selfie|\bmap\b|\blogo\b|diagram|coat of arms|\bflag\b|\bseal\b|\bplan\b|\.svg$|\.tiff?$|\.pdf$/i
const viewWords = /\b(landscapes?|parks?|gardens?|views?|skylines?|lakes?|rivers?|beach(es)?|ponds?|buildings?|churches|towers?|squares?|bridges?|exteriors?|trees?|trails?|hills?|waterfronts?)\b/i

type CommonsPage = {
  title?: string
  index?: number
  imageinfo?: Array<{
    thumburl?: string
    mime?: string
    extmetadata?: { Categories?: { value?: string } }
  }>
}

function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !['park', 'square', 'church', 'garden', 'saint'].includes(word))
}

function choose(pages: CommonsPage[], name: string): string | null {
  const words = nameWords(name)
  let best: { url: string; score: number } | null = null
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    const title = page.title ?? ''
    const categories = info?.extmetadata?.Categories?.value ?? ''
    if (!info?.thumburl || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? '')) continue
    if (notAView.test(title) || peopleWords.test(categories) || peopleWords.test(title)) continue
    const haystack = `${title} ${categories}`.toLowerCase()
    let score = -(page.index ?? 0) * 0.2
    if (words.some((word) => haystack.includes(word))) score += 3
    if (viewWords.test(categories) || viewWords.test(title)) score += 1
    if (!best || score > best.score) best = { url: info.thumburl, score }
  }
  return best?.url ?? null
}

async function lookup(latitude: number, longitude: number, kind: StudyKind, name: string): Promise<string | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('generator', 'geosearch')
  url.searchParams.set('ggsnamespace', '6')
  url.searchParams.set('ggscoord', `${latitude}|${longitude}`)
  url.searchParams.set('ggsradius', String(searchRadius[kind]))
  url.searchParams.set('ggslimit', '12')
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|mime|extmetadata')
  url.searchParams.set('iiextmetadatafilter', 'Categories')
  url.searchParams.set('iiurlwidth', '480')
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const body = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } }
    return choose(Object.values(body.query?.pages ?? {}), name)
  } catch {
    return null
  }
}

export function placePhoto(latitude: number, longitude: number, kind: StudyKind, name: string): Promise<string | null> {
  const key = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${kind}`
  const known = cache.get(key)
  if (known) return known
  const pending = lookup(latitude, longitude, kind, name)
  cache.set(key, pending)
  return pending
}
