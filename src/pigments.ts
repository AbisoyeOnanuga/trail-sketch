import type { StudyKind } from '../shared/studies.ts'

export type Pigment = { name: string; hex: string }

const catalog: Pigment[] = [
  { name: 'Cadmium red', hex: '#d4532b' },
  { name: 'Burnt sienna', hex: '#8c4a2f' },
  { name: 'Alizarin', hex: '#8e3048' },
  { name: 'Yellow ochre', hex: '#c4a15a' },
  { name: 'Lemon yellow', hex: '#e2c84a' },
  { name: 'Sap green', hex: '#4f7a3a' },
  { name: 'Viridian', hex: '#1f6b56' },
  { name: 'Cerulean', hex: '#5e8ea6' },
  { name: 'Cobalt blue', hex: '#2c4a68' },
  { name: 'Ultramarine', hex: '#2f4d6e' },
  { name: 'Payne’s gray', hex: '#4a5560' },
  { name: 'Raw umber', hex: '#6b5040' },
  { name: 'Ivory black', hex: '#2a2723' },
  { name: 'Titanium white', hex: '#f4efe6' },
  { name: 'Naples yellow', hex: '#e9d39a' },
  { name: 'Cobalt teal', hex: '#3e9c96' },
  { name: 'Hooker’s green', hex: '#2f5a3a' },
  { name: 'Indigo', hex: '#2b3550' },
  { name: 'Rose madder', hex: '#c86a76' },
  { name: 'Terre verte', hex: '#7d8f72' },
  { name: 'Venetian red', hex: '#9a4a37' },
  { name: 'Raw sienna', hex: '#b77a3e' },
  { name: 'Neutral tint', hex: '#3d3d42' },
]

const paper = '#f4f2ec'

const kindPools: Record<StudyKind | 'any', string[]> = {
  water: ['Cerulean', 'Naples yellow', 'Cobalt teal', 'Raw umber', 'Payne’s gray', 'Indigo'],
  park: ['Lemon yellow', 'Naples yellow', 'Sap green', 'Terre verte', 'Hooker’s green', 'Burnt sienna'],
  viewpoint: ['Naples yellow', 'Rose madder', 'Cerulean', 'Cadmium red', 'Ultramarine', 'Indigo'],
  architecture: ['Naples yellow', 'Yellow ochre', 'Raw sienna', 'Venetian red', 'Raw umber', 'Neutral tint'],
  hill: ['Lemon yellow', 'Yellow ochre', 'Terre verte', 'Sap green', 'Burnt sienna', 'Payne’s gray'],
  any: ['Naples yellow', 'Cadmium red', 'Cerulean', 'Viridian', 'Ultramarine', 'Raw umber'],
}

export const inkChoices = [
  { id: 'black', name: 'Black', hex: '#1c1914' },
  { id: 'sepia', name: 'Sepia', hex: '#6b3e2a' },
  { id: 'blue', name: 'Blue-black', hex: '#1e3348' },
] as const

export type InkId = (typeof inkChoices)[number]['id']

export const inkGrades = [
  { name: 'Wash', amount: 0.28 },
  { name: 'Middle', amount: 0.58 },
  { name: 'Full', amount: 1 },
] as const

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ]
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const unit = channel / 255
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function textOn(hex: string): string {
  return luminance(hex) > 0.42 ? '#1c1914' : '#fffaf3'
}

export function mixOnPaper(ink: string, amount: number): string {
  const [pr, pg, pb] = channels(paper)
  const [ir, ig, ib] = channels(ink)
  const blend = (from: number, to: number) => Math.round(from + (to - from) * amount)
  const hex = [blend(pr, ir), blend(pg, ig), blend(pb, ib)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
  return `#${hex}`
}

function byName(name: string): Pigment {
  return catalog.find((item) => item.name === name) ?? catalog[0]
}

function hash(text: string): number {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function season(date: Date): string {
  const month = date.getMonth()
  if (month <= 1 || month === 11) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'autumn'
}

function weatherBucket(weather: string): string {
  if (/rain|drizzle|snow|fog|thunder/i.test(weather)) return 'wet'
  if (/flat|overcast/i.test(weather)) return 'flat'
  if (/soft|cloud/i.test(weather)) return 'soft'
  return 'open'
}

/** One light, one middle, and one dark from the place type's pool, varied by place, weather, and season. */
export function pigmentsForKind(kind: StudyKind | null, weather: string, seed = ''): Pigment[] {
  const pool = kindPools[kind ?? 'any'].map(byName).sort((a, b) => luminance(b.hex) - luminance(a.hex))
  const pick = hash(`${seed}|${weatherBucket(weather)}|${season(new Date())}`)
  return [pool[pick % 2], pool[2 + ((pick >>> 3) % 2)], pool[4 + ((pick >>> 6) % 2)]]
}

export function namePigments(hexes: string[]): Pigment[] {
  const used = new Set<string>()
  return hexes.slice(0, 3).map((hex) => {
    const [r, g, b] = channels(hex)
    const ranked = catalog
      .map((item) => {
        const [cr, cg, cb] = channels(item.hex)
        const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
        return { item, distance }
      })
      .sort((a, b) => a.distance - b.distance)
    const match = ranked.find((entry) => !used.has(entry.item.name)) ?? ranked[0]
    used.add(match.item.name)
    return match.item
  })
}

export function suggestInk(kind: StudyKind | null, weather: string): InkId {
  const text = `${kind ?? ''} ${weather}`
  if (/sun|clear|warm|golden|sepia/i.test(text) || kind === 'park' || kind === 'hill') return 'sepia'
  if (/overcast|cloud|rain|water|cool|fog|blue/i.test(text) || kind === 'water' || kind === 'viewpoint') return 'blue'
  return 'black'
}
