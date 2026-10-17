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

// A preview has to be a view of the place. People, food, and objects fall back to the painted scene.
const peopleWords =
  /\b(people|persons?|man|men|woman|women|boys?|girls?|children|bab(?:y|ies)|faces?|selfies?|headshots?|portraits?|crowds?|weddings?|protests?|demonstrations?|politicians?|mayors?|councillors?|officers?|soldiers?|police|athletes?|players?|musicians?|singers?|actors?|actresses|tourists?|pedestrians?|couples?|famil(?:y|ies)|chefs?|waiters?|waitresses)\b/i
const foodWords =
  /\b(foods?|meals?|dishes?|cuisine|pizzas?|burgers?|sandwiches|coffees?|lattes?|espressos?|teas?|beers?|wines?|cocktails?|desserts?|breakfasts?|lunches|dinners?|brunches?|restaurants?|caf[eé]s?|menus?|plates?|platters?|drinks?|beverages?|snacks?|pastries|cakes?|breads?|salads?|soups?|sushi|tacos?|noodles?|hot ?dogs?|ice ?creams?)\b/i
const notAView =
  /\(cropped\)|portrait|headshot|selfie|\bmap\b|\blogo\b|diagram|coat of arms|\bflag\b|\bseal\b|\bplan\b|screenshot|poster|\bmenu\b|clothing|t-shirts?|\.svg$|\.tiff?$|\.pdf$/i
const eventWords =
  /\b(processions?|parades?|festivals?|concerts?|performances?|ceremon(?:y|ies)|mass(?:es)?|celebrations?|gatherings?|rallies|marches|funerals?|weddings?|musical groups?|bands?)\b/i
const vehicleWords =
  /\b(streetcars?|trams?|buses|trains?|automobiles?|vehicles?|taxis?|subways?|cars?|bicycles?|bikes?|motorcycles?)\b/i
const indoorWords = /\b(interiors?|indoors?)\b/i
const viewWords =
  /\b(landscapes?|parks?|gardens?|views?|skylines?|lakes?|rivers?|beach(?:es)?|ponds?|buildings?|church(?:es)?|cathedrals?|chapels?|temples?|towers?|squares?|bridges?|exteriors?|facades?|trees?|trails?|hills?|waterfronts?|fountains?|monuments?|castles?|shores?|forests?|woodlands?|outdoors?)\b/i
const verticalOk = /\b(buildings?|towers?|churches|cathedrals?|skyscrapers?|facades?|exteriors?|monuments?|castles?)\b/i

type CommonsPage = {
  title?: string
  index?: number
  imageinfo?: Array<{
    thumburl?: string
    mime?: string
    thumbwidth?: number
    thumbheight?: number
    extmetadata?: { Categories?: { value?: string } }
  }>
}

function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) =>
        word.length > 3 &&
        !['park', 'square', 'church', 'garden', 'saint', 'toronto', 'ontario', 'canada', 'city', 'north', 'south', 'east', 'west'].includes(word),
    )
}

function choose(pages: CommonsPage[], name: string): string | null {
  const words = nameWords(name)
  let best: { url: string; score: number } | null = null
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    const title = page.title ?? ''
    const categories = info?.extmetadata?.Categories?.value ?? ''
    if (!info?.thumburl || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? '')) continue
    const haystack = `${title} ${categories}`
    if (
      notAView.test(haystack) ||
      peopleWords.test(haystack) ||
      foodWords.test(haystack) ||
      eventWords.test(haystack) ||
      vehicleWords.test(haystack) ||
      indoorWords.test(haystack)
    ) {
      continue
    }
    const tall = (info.thumbheight ?? 0) > (info.thumbwidth ?? 0) * 1.05
    if (tall && !verticalOk.test(haystack)) continue
    // The file has to read as a view of a place. A name match alone still lets in bands, meals, and streetcars.
    if (!viewWords.test(haystack)) continue
    let score = -(page.index ?? 0) * 0.2
    if (words.some((word) => haystack.toLowerCase().includes(word))) score += 3
    score += 1
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
  url.searchParams.set('ggslimit', '20')
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
