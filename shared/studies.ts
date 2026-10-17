import { z } from 'zod'

export const studyKinds = ['water', 'park', 'viewpoint', 'architecture', 'hill'] as const
export const feelWords = ['still', 'bright', 'tangled', 'open', 'weathered', 'quiet', 'monumental'] as const
export const interestIds = ['water', 'trees', 'buildings', 'sky', 'streets', 'hills'] as const

export type StudyKind = (typeof studyKinds)[number]
export type FeelWord = (typeof feelWords)[number]
export type InterestId = (typeof interestIds)[number]

export const distanceChoices = [
  { id: 'here', label: 'Here', meters: 1500 },
  { id: 'walk', label: 'A walk', meters: 4000 },
  { id: 'hike', label: 'A hike', meters: 12000 },
  { id: 'ride', label: 'A ride', meters: 20000 },
  { id: 'drive', label: 'A drive', meters: 40000 },
] as const

export type DistanceId = (typeof distanceChoices)[number]['id']

export const feelLabels: Record<FeelWord, string> = {
  still: 'Still',
  bright: 'Bright',
  tangled: 'Trees',
  open: 'Open',
  weathered: 'Weathered',
  quiet: 'Quiet',
  monumental: 'Monumental',
}

export const interestLabels: Record<InterestId, string> = {
  water: 'Water',
  trees: 'Trees',
  buildings: 'Buildings',
  sky: 'Sky',
  streets: 'Streets',
  hills: 'Hills',
}

const interestKinds: Record<InterestId, StudyKind[]> = {
  water: ['water'],
  trees: ['park'],
  buildings: ['architecture'],
  sky: ['viewpoint'],
  streets: ['architecture'],
  hills: ['hill'],
}

const kindLines: Record<StudyKind, string> = {
  water: 'Still water against a bank. A clear edge for the study.',
  park: 'Canopy over ground. One dark mass, one lit opening.',
  viewpoint: 'Open light and a far edge. Keep the sky simple.',
  architecture: 'A weathered face. One plane lit, one in shadow.',
  hill: 'A ridge against the sky. The horizon does the work.',
}

const kindFeel: Record<StudyKind, FeelWord> = {
  water: 'still',
  park: 'tangled',
  viewpoint: 'open',
  architecture: 'weathered',
  hill: 'open',
}

export function portraitFor(kind: StudyKind): { feel: FeelWord; line: string } {
  return { feel: kindFeel[kind], line: kindLines[kind] }
}

export const studySchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  longitude: z.number().gte(-180).lte(180),
  latitude: z.number().gte(-90).lte(90),
  distanceMeters: z.number().nonnegative().max(40_000_000),
  kind: z.enum(studyKinds),
  feel: z.enum(feelWords),
  line: z.string().min(1).max(160),
})

export type Study = z.infer<typeof studySchema>

export const nearbySchema = z.object({
  studies: z.array(studySchema).max(20),
})

export function distanceMeters(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const earth = 6_371_000
  const dLat = ((toLat - fromLat) * Math.PI) / 180
  const dLon = ((toLon - fromLon) * Math.PI) / 180
  const lat1 = (fromLat * Math.PI) / 180
  const lat2 = (toLat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const CASUAL_REACH_METERS = 40_000

export function reachLabel(meters: number): string {
  if (!Number.isFinite(meters) || meters < 40) return 'Here'
  if (meters <= 1_500) return 'Walkable'
  if (meters <= 4_000) return 'A walk'
  if (meters <= 12_000) return 'A hike'
  if (meters <= 20_000) return 'A ride'
  if (meters <= 40_000) return 'A drive'
  return 'Farther out'
}

export function reachLine(meters: number): string {
  const reach = reachLabel(meters)
  const distance = formatDistance(meters)
  return reach === distance ? reach : `${reach} · ${distance}`
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 40) return 'Here'
  if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)} m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

export function leadInterest(study: Study, interests: InterestId[]): InterestId | null {
  return interests.find((interest) => interestKinds[interest].includes(study.kind)) ?? null
}

export type RankInput = { feel: FeelWord | null; description: string; interests: InterestId[] }

function studyWords(description: string): string[] {
  return description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
    .slice(0, 12)
}

function studyHay(study: Study): string {
  const labels = interestIds
    .filter((interest) => interestKinds[interest].includes(study.kind))
    .map((interest) => interestLabels[interest])
  return `${study.name} ${study.kind} ${study.feel} ${study.line} ${labels.join(' ')}`.toLowerCase()
}

function studyRank(study: Study, input: RankInput): { score: number; reason: 'words' | 'feel' | 'interest' | 'near' } {
  const hay = studyHay(study)
  let wordHit = false
  let score = 0
  for (const word of studyWords(input.description)) {
    if (hay.includes(word)) {
      score += 8
      wordHit = true
    }
  }
  const feelHit = input.feel !== null && study.feel === input.feel
  if (feelHit) score += 6
  const interest = leadInterest(study, input.interests)
  if (interest) score += 6
  const reason = wordHit ? 'words' : feelHit ? 'feel' : interest ? 'interest' : 'near'
  return { score, reason }
}

export function rankStudies(studies: Study[], input: RankInput): Study[] {
  return studies
    .map((study, index) => ({ study, index, ...studyRank(study, input) }))
    .sort((a, b) => b.score - a.score || a.study.distanceMeters - b.study.distanceMeters || a.index - b.index)
    .map((entry) => entry.study)
}

export function bestPhrase(study: Study, input: RankInput): string {
  const { reason } = studyRank(study, input)
  if (reason === 'words') return 'Matches that'
  if (reason === 'feel' && input.feel) return feelLabels[input.feel]
  if (reason === 'interest') {
    const interest = leadInterest(study, input.interests)
    if (interest) return `For ${interestLabels[interest].toLowerCase()}`
  }
  return 'Start here'
}
