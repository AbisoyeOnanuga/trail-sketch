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
]

const paper = '#f3ecdf'

const kindSets: Record<StudyKind, [string, string, string]> = {
  water: ['Cerulean', 'Raw umber', 'Payne’s gray'],
  park: ['Sap green', 'Yellow ochre', 'Burnt sienna'],
  viewpoint: ['Cobalt blue', 'Cadmium red', 'Lemon yellow'],
  architecture: ['Raw umber', 'Yellow ochre', 'Ivory black'],
  hill: ['Yellow ochre', 'Sap green', 'Payne’s gray'],
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

export function pigmentsForKind(kind: StudyKind | null, weather: string): Pigment[] {
  const cool = /overcast|cloud|rain|flat|grey|gray|cool|fog/i.test(weather)
  const names = kind ? kindSets[kind] : (['Cadmium red', 'Viridian', 'Cobalt blue'] as [string, string, string])
  const ordered = cool ? [names[2], names[0], names[1]] : [...names]
  return ordered.map(byName)
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
