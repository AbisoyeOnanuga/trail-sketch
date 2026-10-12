import { z } from 'zod'
import { mediums, type Medium } from '../shared/contract.ts'
import { studyKinds, type StudyKind } from '../shared/studies.ts'

const visitSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  kind: z.enum(studyKinds),
  studiedAt: z.string().max(40),
  medium: z.enum(mediums),
  weatherLine: z.string().max(180),
})

export type Visit = z.infer<typeof visitSchema>

const profileSchema = z.object({
  sub: z.string().min(1).max(64),
  name: z.string().max(80),
  email: z.string().max(120),
})

export type GoogleProfile = z.infer<typeof profileSchema>

const PROFILE_KEY = 'trail-sketch.google-profile'

function visitKey(sub: string | null): string {
  return `trail-sketch.visits.${sub && sub.length > 0 ? sub : 'device'}`
}

export function readProfile(): GoogleProfile | null {
  try {
    const parsed = profileSchema.safeParse(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null'))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writeProfile(profile: GoogleProfile | null): void {
  if (!profile) {
    localStorage.removeItem(PROFILE_KEY)
    return
  }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function readVisits(sub: string | null): Visit[] {
  try {
    const parsed = z.array(visitSchema).max(80).safeParse(JSON.parse(localStorage.getItem(visitKey(sub)) ?? '[]'))
    if (!parsed.success) return []
    return parsed.data.sort((a, b) => b.studiedAt.localeCompare(a.studiedAt))
  } catch {
    return []
  }
}

export function rememberVisit(visit: Visit, sub: string | null): Visit[] {
  const current = readVisits(sub).filter(
    (item) => Math.abs(item.latitude - visit.latitude) > 0.0004 || Math.abs(item.longitude - visit.longitude) > 0.0004,
  )
  const next = [visit, ...current].slice(0, 80)
  localStorage.setItem(visitKey(sub), JSON.stringify(next))
  return next
}

export function forgetVisit(id: string, studiedAt: string, sub: string | null): Visit[] {
  const next = readVisits(sub).filter((visit) => visit.id !== id || visit.studiedAt !== studiedAt)
  localStorage.setItem(visitKey(sub), JSON.stringify(next))
  return next
}

export function noteVisitWeather(
  sub: string | null,
  latitude: number,
  longitude: number,
  weatherLine: string,
): Visit[] {
  const next = readVisits(sub).map((visit) =>
    Math.abs(visit.latitude - latitude) < 0.0004 && Math.abs(visit.longitude - longitude) < 0.0004
      ? { ...visit, weatherLine }
      : visit,
  )
  localStorage.setItem(visitKey(sub), JSON.stringify(next))
  return next
}

export function visitStamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function isStudied(visits: Visit[], latitude: number, longitude: number): boolean {
  return visits.some(
    (visit) => Math.abs(visit.latitude - latitude) < 0.0004 && Math.abs(visit.longitude - longitude) < 0.0004,
  )
}

export function kindLabel(kind: StudyKind): string {
  if (kind === 'water') return 'Water'
  if (kind === 'park') return 'Trees'
  if (kind === 'architecture') return 'Buildings'
  if (kind === 'hill') return 'Ridge'
  return 'Viewpoint'
}

export function mediumName(medium: Medium): string {
  if (medium === 'watercolor') return 'Watercolor'
  if (medium === 'graphite') return 'Graphite'
  if (medium === 'ink') return 'Ink'
  return 'Oil'
}
