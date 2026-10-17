/** Isolines of a height field, then a traveling wave that bends those lines. */

export type ContourLine = { points: Array<[number, number]>; closed: boolean }

const VIEW_W = 200
const VIEW_H = 160
const PAD = 22

type Warp = { speed: number; amp: number; phase: number }

const segments: Record<number, Array<[number, number]>> = {
  0: [],
  1: [[3, 2]],
  2: [[2, 1]],
  3: [[3, 1]],
  4: [[0, 1]],
  6: [[0, 2]],
  7: [[3, 0]],
  8: [[0, 3]],
  9: [[0, 2]],
  11: [[0, 1]],
  12: [[3, 1]],
  13: [[2, 1]],
  14: [[3, 2]],
  15: [],
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generatedField(seed: number, size = 8): number[] {
  const rand = mulberry32(seed)
  const coarse = 4
  const knots = Array.from({ length: coarse * coarse }, () => rand() * 80 + 20)
  const values: number[] = []
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fx = (x / (size - 1)) * (coarse - 1)
      const fy = (y / (size - 1)) * (coarse - 1)
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const x1 = Math.min(coarse - 1, x0 + 1)
      const y1 = Math.min(coarse - 1, y0 + 1)
      const tx = fx - x0
      const ty = fy - y0
      const sample = (cx: number, cy: number) => knots[cy * coarse + cx]
      const top = sample(x0, y0) * (1 - tx) + sample(x1, y0) * tx
      const bottom = sample(x0, y1) * (1 - tx) + sample(x1, y1) * tx
      const ridge = Math.sin(x * 0.7 + seed) * 6 + Math.cos(y * 0.55) * 4
      values.push(top * (1 - ty) + bottom * ty + ridge)
    }
  }
  return values
}

export function fieldSpan(values: number[]): number {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return Number.isFinite(min) ? max - min : 0
}

export function contourLines(values: number[], size: number, steps = [0.2, 0.36, 0.52, 0.68, 0.84]): ContourLine[] {
  if (values.length !== size * size || size < 2) return []
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  if (!(max - min > 0)) return []
  const levels = steps.map((t) => min + (max - min) * t)
  const lines: ContourLine[] = []
  for (const level of levels) lines.push(...trace(values, size, level))
  return toCard(
    lines.map((line) => ({ ...line, points: smoothLine(line.points, line.closed) })),
    size,
  )
    .map((line) => ({ ...line, points: resample(line.points, line.closed) }))
    .filter((line) => line.points.length >= 4 && lengthOf(line.points) > 28)
    .sort((a, b) => lengthOf(b.points) - lengthOf(a.points))
    .slice(0, 7)
}

function trace(values: number[], size: number, level: number): ContourLine[] {
  const at = (x: number, y: number) => values[y * size + x]
  const loose: Array<[[number, number], [number, number]]> = []
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const tl = at(x, y)
      const tr = at(x + 1, y)
      const br = at(x + 1, y + 1)
      const bl = at(x, y + 1)
      let mask = 0
      if (tl >= level) mask |= 8
      if (tr >= level) mask |= 4
      if (br >= level) mask |= 2
      if (bl >= level) mask |= 1
      const edges = edgePoint(x, y, tl, tr, br, bl, level)
      const pairs = mask === 5 || mask === 10 ? saddle(mask, tl, tr, br, bl, level) : (segments[mask] ?? [])
      for (const [from, to] of pairs) loose.push([edges[from], edges[to]])
    }
  }
  return stitch(loose)
}

function saddle(mask: number, tl: number, tr: number, br: number, bl: number, level: number): Array<[number, number]> {
  const center = (tl + tr + br + bl) / 4
  const joined = center >= level
  if (mask === 5) return joined ? [[0, 1], [3, 2]] : [[0, 3], [1, 2]]
  return joined ? [[0, 3], [1, 2]] : [[0, 1], [3, 2]]
}

function edgePoint(
  x: number,
  y: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
  level: number,
): Array<[number, number]> {
  return [
    mix([x, y], tl, [x + 1, y], tr, level),
    mix([x + 1, y], tr, [x + 1, y + 1], br, level),
    mix([x, y + 1], bl, [x + 1, y + 1], br, level),
    mix([x, y], tl, [x, y + 1], bl, level),
  ]
}

function mix(a: [number, number], av: number, b: [number, number], bv: number, level: number): [number, number] {
  const span = bv - av
  const t = span === 0 ? 0.5 : (level - av) / span
  const clamped = Math.min(1, Math.max(0, t))
  return [a[0] + (b[0] - a[0]) * clamped, a[1] + (b[1] - a[1]) * clamped]
}

function stitch(parts: Array<[[number, number], [number, number]]>): ContourLine[] {
  const unused = parts.map(() => true)
  const lines: ContourLine[] = []
  const key = (point: [number, number]) => `${point[0].toFixed(3)},${point[1].toFixed(3)}`
  const index = new Map<string, number[]>()
  parts.forEach((part, id) => {
    for (const point of part) {
      const bucket = index.get(key(point)) ?? []
      bucket.push(id)
      index.set(key(point), bucket)
    }
  })

  const next = (from: number, at: [number, number]): { id: number; point: [number, number] } | null => {
    for (const id of index.get(key(at)) ?? []) {
      if (id === from || !unused[id]) continue
      const [a, b] = parts[id]
      const point = key(a) === key(at) ? b : a
      return { id, point }
    }
    return null
  }

  for (let start = 0; start < parts.length; start += 1) {
    if (!unused[start]) continue
    unused[start] = false
    const forward: Array<[number, number]> = [parts[start][0], parts[start][1]]
    let guard = 0
    while (guard < parts.length) {
      const found = next(start, forward[forward.length - 1])
      if (!found) break
      unused[found.id] = false
      forward.push(found.point)
      guard += 1
    }
    const backward: Array<[number, number]> = []
    guard = 0
    while (guard < parts.length) {
      const found = next(start, backward[0] ?? forward[0])
      if (!found) break
      unused[found.id] = false
      backward.unshift(found.point)
      guard += 1
    }
    const points = [...backward, ...forward]
    const closed = points.length > 3 && key(points[0]) === key(points[points.length - 1])
    if (closed) points.pop()
    lines.push({ points, closed })
  }
  return lines
}

function smoothLine(points: Array<[number, number]>, closed: boolean): Array<[number, number]> {
  let current = points
  for (let pass = 0; pass < 2; pass += 1) current = chaikin(current, closed)
  return current
}

function chaikin(points: Array<[number, number]>, closed: boolean): Array<[number, number]> {
  const count = points.length
  if (count < 3) return points
  const next: Array<[number, number]> = []
  const steps = closed ? count : count - 1
  if (!closed) next.push(points[0])
  for (let i = 0; i < steps; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % count]
    next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
  }
  if (!closed) next.push(points[count - 1])
  return next
}

function resample(points: Array<[number, number]>, closed: boolean): Array<[number, number]> {
  if (points.length < 2) return points
  const loop = closed ? [...points, points[0]] : points
  const spacing = 7
  const out: Array<[number, number]> = [loop[0]]
  let carry = 0
  for (let i = 1; i < loop.length; i += 1) {
    const a = loop[i - 1]
    const b = loop[i]
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (dist === 0) continue
    let walked = spacing - carry
    while (walked <= dist && out.length < 56) {
      const t = walked / dist
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      walked += spacing
    }
    carry = dist - (walked - spacing)
  }
  return out.length >= 4 ? out : points
}

function lengthOf(points: Array<[number, number]>): number {
  let total = 0
  for (let i = 1; i < points.length; i += 1) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return total
}

export function toCard(lines: ContourLine[], size: number): ContourLine[] {
  const span = Math.max(1, size - 1)
  return lines.map((line) => ({
    closed: line.closed,
    points: line.points.map(([x, y]) => [
      PAD + (x / span) * (VIEW_W - PAD * 2),
      PAD + (y / span) * (VIEW_H - PAD * 2),
    ]),
  }))
}

export function warpPath(points: Array<[number, number]>, closed: boolean, time: number, warp: Warp): string {
  const moved = points.map(([x, y], index) => displace(x, y, time, warp, index / Math.max(1, points.length)))
  return curve(relax(moved, closed), closed)
}

function relax(points: Array<[number, number]>, closed: boolean): Array<[number, number]> {
  const count = points.length
  if (count < 3) return points
  return points.map((point, index) => {
    const prev = neighbor(points, index - 1, closed)
    const next = neighbor(points, index + 1, closed)
    return [point[0] * 0.5 + (prev[0] + next[0]) * 0.25, point[1] * 0.5 + (prev[1] + next[1]) * 0.25]
  })
}

function neighbor(points: Array<[number, number]>, index: number, closed: boolean): [number, number] {
  const count = points.length
  if (closed) return points[(index + count) % count]
  if (index < 0) return points[0]
  if (index >= count) return points[count - 1]
  return points[index]
}

function displace(x: number, y: number, time: number, warp: Warp, along: number): [number, number] {
  const travel = time * warp.speed
  const swell = 0.62 + 0.38 * Math.sin(travel * 0.22 + warp.phase)
  const alongWave = Math.sin(along * Math.PI * 2 + travel * 0.8 + warp.phase)
  const east = Math.sin(y * 0.062 + travel + warp.phase) + 0.45 * Math.sin(x * 0.03 + travel * 0.47)
  const north = Math.cos(x * 0.055 - travel * 0.86 + warp.phase * 1.4) + 0.4 * Math.sin(y * 0.028 + travel * 0.33)
  const reach = warp.amp * swell * (0.72 + 0.28 * alongWave)
  return [x + east * reach, y + north * reach * 0.86]
}

function curve(points: Array<[number, number]>, closed: boolean): string {
  const count = points.length
  if (count === 0) return ''
  const at = (index: number): [number, number] => {
    if (closed) return points[(index + count) % count]
    if (index < 0) {
      const a = points[0]
      const b = points[Math.min(1, count - 1)]
      return [a[0] * 2 - b[0], a[1] * 2 - b[1]]
    }
    if (index >= count) {
      const a = points[count - 1]
      const b = points[Math.max(0, count - 2)]
      return [a[0] * 2 - b[0], a[1] * 2 - b[1]]
    }
    return points[index]
  }
  const last = closed ? count : count - 1
  const parts = [`M${n(points[0][0])} ${n(points[0][1])}`]
  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    parts.push(
      `C${n(p1[0] + (p2[0] - p0[0]) / 8)} ${n(p1[1] + (p2[1] - p0[1]) / 8)} ${n(p2[0] - (p3[0] - p1[0]) / 8)} ${n(p2[1] - (p3[1] - p1[1]) / 8)} ${n(p2[0])} ${n(p2[1])}`,
    )
  }
  if (closed) parts.push('Z')
  return parts.join(' ')
}

function n(value: number): string {
  return value.toFixed(1)
}

export const titleWarp: Warp = { speed: 0.72, amp: 7, phase: 0.4 }
export const fieldWarp: Warp = { speed: 0.46, amp: 5, phase: 2.6 }
export const titleSteps = [0.18, 0.4, 0.58, 0.78]
export const fieldSteps = [0.28, 0.48, 0.66, 0.86]
