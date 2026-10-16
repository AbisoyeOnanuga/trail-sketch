import { mediumLabels, usesPigment, type FieldCard, type Location, type Medium } from '../../shared/contract.ts'
import type { StudyKind } from '../../shared/studies.ts'
import { inkChoices, pigmentsForKind, suggestInk } from '../pigments.ts'

type Light = 'open' | 'soft' | 'flat' | 'unknown'
type TimeOfDay = 'morning' | 'midday' | 'late' | 'night'

const tonesByKind: Record<StudyKind | 'any', [string, string, string]> = {
  water: ['Sky caught on the water', 'The far bank and its reflection', 'Shadow under the near edge'],
  park: ['Sky through the canopy', 'Grass and leaf masses in light', 'Trunks and the shade beneath'],
  architecture: ['Sky and the lit wall', 'The wall turned from the light', 'Windows, doorways, cast shadow'],
  viewpoint: ['Sky near the horizon', 'Distant land, cooled by air', 'The near ground and its edge'],
  hill: ['Sky over the ridge', 'The slope in light', 'The shaded side and its trees'],
  any: ['The sky', 'The main shapes in light', 'The shadows that hold them'],
}

const motifByKind: Record<StudyKind | 'any', string> = {
  water: 'Reflections broken by the near edge',
  park: 'Leaf masses against open sky',
  architecture: 'One lit wall against one shaded wall',
  viewpoint: 'Layers of distance, each paler than the last',
  hill: 'The ridge line against the sky',
  any: 'A few big shapes before any detail',
}

const subjectByKind: Record<StudyKind | 'any', string> = {
  water: 'Draw the shoreline first, then let the reflections sit directly under what casts them.',
  park: 'Group the trees into three or four masses instead of drawing leaves.',
  architecture: 'Find the one corner where the lit wall meets the shaded wall, and build from there.',
  viewpoint: 'Split the view into near, middle, and far bands, and keep the far band lightest.',
  hill: 'Set the ridge line high or low on the page, never through the middle.',
  any: 'Pick one shape that caught your eye and let everything else support it.',
}

const mediumTip: Record<Medium, string> = {
  graphite: 'Hatch the middle tone, then press harder only for the darks.',
  charcoal: 'Mass the darks with the side of the stick, then lift the lights with an eraser.',
  ink: 'Map the darks lightly in pencil first; ink will not come back.',
  watercolor: 'Leave bare paper for the lightest tone and wash from light to dark.',
  gouache: 'Lay the middle tone flat, then paint the darks and the lights over it.',
  oil: 'Block in the darks thinly, then the middle tone, and save the lights for last.',
}

function lightOf(weather: string): Light {
  if (/open light|clear/i.test(weather)) return 'open'
  if (/soft light|partly/i.test(weather)) return 'soft'
  if (/flat light|overcast|fog|rain|drizzle|snow/i.test(weather)) return 'flat'
  return 'unknown'
}

function timeOf(date: Date): TimeOfDay {
  const hour = date.getHours()
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 15) return 'midday'
  if (hour >= 15 && hour < 20) return 'late'
  return 'night'
}

const lightLine: Record<Light, string> = {
  open: 'The light is open, so shadows have hard edges and they will move. Mark them first.',
  soft: 'The light is soft, so most edges stay gentle. Look for the few that are sharp.',
  flat: 'The light is flat, so separate the shapes by tone rather than by shadow.',
  unknown: 'Squint until the scene falls into three tones before you make a mark.',
}

const timeLine: Record<TimeOfDay, string> = {
  morning: 'Morning light is still low and will climb for hours.',
  midday: 'Midday light holds still, so take your time with the shapes.',
  late: 'Late light moves quickly; plan on about forty minutes.',
  night: 'The light is going. Work small and fast, or come back in daylight.',
}

function leaveLine(light: Light, time: TimeOfDay): string {
  if (time === 'late' || time === 'night') return 'Stop when the color drains out of the sky.'
  if (light === 'open') return 'Stop when the shadows you drew have moved a hand’s width.'
  if (light === 'flat') return 'Stop when the cold or the wet starts shortening your marks.'
  return 'Stop when the light you came for has changed.'
}

function listWords(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

export function placeSeed(location: Location): string {
  return `${location.name}|${location.latitude.toFixed(3)}|${location.longitude.toFixed(3)}`
}

export function toneNotes(kind: StudyKind | null): [string, string, string] {
  return tonesByKind[kind ?? 'any']
}

export function fallbackPlan(
  location: Location,
  medium: Medium,
  sky: string,
  kind: StudyKind | null,
  now = new Date(),
): FieldCard {
  const pigment = usesPigment(medium)
  const weather = sky || 'The weather is not in yet'
  const light = lightOf(weather)
  const time = timeOf(now)
  const key = kind ?? 'any'
  const pigments = pigment ? pigmentsForKind(kind, weather, placeSeed(location)) : []
  const ink = medium === 'ink' ? inkChoices.find((item) => item.id === suggestInk(kind, weather)) : undefined
  const colorLine = pigment
    ? ` Start with ${listWords(pigments.map((item) => item.name.toLowerCase()))}.`
    : ink
      ? ` A ${ink.name.toLowerCase()} ink suits this light.`
      : ''
  const subject = `${subjectByKind[key]} ${lightLine[light]} ${mediumTip[medium]}`
  const spoken = `${location.name}. ${weather}. ${motifByKind[key]}. ${subjectByKind[key]} ${lightLine[light]} ${timeLine[time]} For ${mediumLabels[medium].toLowerCase()}: ${mediumTip[medium]}${colorLine}`

  return {
    placeName: location.name,
    longitude: location.longitude,
    latitude: location.latitude,
    medium,
    motif: motifByKind[key],
    values: [...tonesByKind[key]],
    palette: pigments.map((item) => item.hex),
    subject: `${subject}${colorLine}`.slice(0, 500),
    leaveBefore: leaveLine(light, time),
    spokenScript: spoken.slice(0, 600),
    weatherLine: weather,
    generatedAt: now.toISOString(),
    source: 'sample',
  }
}
