import { z } from 'zod'

export const mediums = ['graphite', 'charcoal', 'ink', 'watercolor', 'gouache', 'oil'] as const

export const mediumSchema = z.enum(mediums)

export type Medium = z.infer<typeof mediumSchema>

export const locationSchema = z.object({
  longitude: z.number().gte(-180).lte(180),
  latitude: z.number().gte(-90).lte(90),
  name: z.string().trim().min(1).max(120),
})

export type Location = z.infer<typeof locationSchema>

export const fieldCardRequestSchema = locationSchema.extend({
  medium: mediumSchema,
})

export type FieldCardRequest = z.infer<typeof fieldCardRequestSchema>

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/)

export const fieldCardSchema = z.object({
  placeName: z.string().max(120),
  longitude: z.number().gte(-180).lte(180),
  latitude: z.number().gte(-90).lte(90),
  medium: mediumSchema,
  motif: z.string().max(160),
  values: z.array(z.string().max(80)).length(3),
  palette: z.array(hexColor).max(3),
  subject: z.string().max(500),
  leaveBefore: z.string().max(180),
  spokenScript: z.string().max(600),
  weatherLine: z.string().max(180),
  generatedAt: z.string().max(40),
  source: z.enum(['gemma', 'sample']),
})

export type FieldCard = z.infer<typeof fieldCardSchema>

export const placeSchema = z.object({
  name: z.string().max(120),
  weatherLine: z.string().max(180),
  longitude: z.number(),
  latitude: z.number(),
})

export type PlaceDetails = z.infer<typeof placeSchema>

export const searchResultSchema = z.object({
  results: z.array(locationSchema).max(5),
})

export const mediumLabels: Record<Medium, string> = {
  graphite: 'Graphite',
  charcoal: 'Charcoal',
  ink: 'Ink',
  watercolor: 'Watercolor',
  gouache: 'Gouache',
  oil: 'Oil',
}

export const mediumPhrases: Record<Medium, string> = {
  graphite: 'Sketching with graphite',
  charcoal: 'Drawing in charcoal',
  ink: 'Drawing in ink',
  watercolor: 'Painting in watercolor',
  gouache: 'Painting in gouache',
  oil: 'Painting in oil',
}

export function usesPigment(medium: Medium): boolean {
  return medium === 'watercolor' || medium === 'gouache' || medium === 'oil'
}
