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

const feelKinds: Record<FeelWord, StudyKind[]> = {
  still: ['water'],
  bright: ['viewpoint', 'water'],
  tangled: ['park'],
  open: ['viewpoint', 'hill'],
  weathered: ['architecture'],
  quiet: ['park', 'water'],
  monumental: ['architecture', 'hill'],
}

const interestKinds: Record<InterestId, StudyKind[]> = {
  water: ['water'],
  trees: ['park'],
  buildings: ['architecture'],
  sky: ['viewpoint'],
  streets: ['architecture'],
  hills: ['hill'],
}

const wordKinds: Record<string, StudyKind[]> = {
  water: ['water'],
  lake: ['water'],
  river: ['water'],
  pond: ['water'],
  shore: ['water'],
  beach: ['water'],
  sea: ['water'],
  canal: ['water'],
  tree: ['park'],
  trees: ['park'],
  wood: ['park'],
  park: ['park'],
  garden: ['park'],
  canopy: ['park'],
  forest: ['park'],
  bridge: ['architecture'],
  stone: ['architecture'],
  ruin: ['architecture'],
  building: ['architecture'],
  church: ['architecture'],
  tower: ['architecture'],
  street: ['architecture'],
  wall: ['architecture'],
  arch: ['architecture'],
  sky: ['viewpoint'],
  view: ['viewpoint'],
  overlook: ['viewpoint'],
  horizon: ['viewpoint'],
  light: ['viewpoint'],
  hill: ['hill'],
  ridge: ['hill'],
  peak: ['hill'],
  hike: ['hill'],
  cliff: ['hill'],
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

export const CASUAL_REACH_METERS = 12_000

export function reachLabel(meters: number): string {
  if (!Number.isFinite(meters) || meters < 40) return 'Here'
  if (meters <= 1_500) return 'Walkable'
  if (meters <= 8_000) return 'Short ride'
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

export function rankStudies(
  studies: Study[],
  input: { feel: FeelWord | null; description: string; interests: InterestId[] },
): Study[] {
  const words = input.description
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
    .slice(0, 12)

  return studies
    .map((study, index) => {
      let score = 0
      if (input.feel && study.feel === input.feel) score += 6
      if (input.feel && feelKinds[input.feel].includes(study.kind)) score += 4
      for (const interest of input.interests) {
        if (interestKinds[interest].includes(study.kind)) score += 3
      }
      const hay = `${study.name} ${study.kind} ${study.feel} ${study.line}`.toLowerCase()
      for (const word of words) {
        if (hay.includes(word)) score += 5
        const kinds = wordKinds[word]
        if (kinds?.includes(study.kind)) score += 3
      }
      score -= study.distanceMeters / 4000
      return { study, score, index }
    })
    .sort((a, b) => b.score - a.score || a.study.distanceMeters - b.study.distanceMeters || a.index - b.index)
    .map((entry) => entry.study)
}
