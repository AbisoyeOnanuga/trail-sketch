/** Nested field contours. Each seed draws a different hill, so the two cards do not match. */

type Harmonic = { k: number; amp: number; phase: number }
type Hill = { rings: string[]; fringes: string[] }

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function closedRing(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tilt: number,
  harmonics: Harmonic[],
): string {
  const count = 36
  const points: Array<[number, number]> = []
  for (let i = 0; i < count; i += 1) {
    const t = (i / count) * Math.PI * 2
    let scale = 1
    for (const harmonic of harmonics) {
      scale += harmonic.amp * Math.sin(harmonic.k * t + harmonic.phase)
    }
    const x = Math.cos(t) * rx * scale
    const y = Math.sin(t) * ry * scale
    const cos = Math.cos(tilt)
    const sin = Math.sin(tilt)
    points.push([cx + x * cos - y * sin, cy + x * sin + y * cos])
  }
  return smooth(points, true)
}

function fringe(x0: number, y0: number, x1: number, y1: number, amp: number, phase: number): string {
  const steps = 8
  const dx = x1 - x0
  const dy = y1 - y0
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length
  const ny = dx / length
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const envelope = Math.sin(t * Math.PI)
    const wave = Math.sin(t * Math.PI * 3 + phase) * amp * envelope
    points.push([x0 + dx * t + nx * wave, y0 + dy * t + ny * wave])
  }
  return smooth(points, false)
}

function smooth(points: Array<[number, number]>, closed: boolean): string {
  const count = points.length
  const last = closed ? count : count - 1
  const parts: string[] = [`M${n(points[0][0])} ${n(points[0][1])}`]
  for (let i = 0; i < last; i += 1) {
    const p0 = points[(i - 1 + count) % count]
    const p1 = points[i]
    const p2 = points[(i + 1) % count]
    const p3 = points[(i + 2) % count]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    parts.push(`C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(p2[0])} ${n(p2[1])}`)
  }
  if (closed) parts.push('Z')
  return parts.join(' ')
}

function n(value: number): string {
  return value.toFixed(1)
}

function drawHill(seed: number): Hill {
  const rand = mulberry32(seed)
  const cx = 100 + (rand() - 0.5) * 16
  const cy = 82 + (rand() - 0.5) * 12
  const tilt = (rand() - 0.5) * 0.45
  const base: Harmonic[] = [1, 2, 3, 5].map((k) => ({
    k,
    amp: 0.03 + rand() * 0.05,
    phase: rand() * Math.PI * 2,
  }))
  const sizes: Array<[number, number]> = [
    [68, 44],
    [54, 34],
    [40, 25],
    [27, 16],
    [14, 8],
  ]
  const rings = sizes.map(([rx, ry], index) => {
    const harmonics = base.map((harmonic) => ({
      k: harmonic.k,
      amp: harmonic.amp * (0.75 + rand() * 0.55),
      phase: harmonic.phase + index * 0.85,
    }))
    return closedRing(cx - index * 1.6, cy + index * 0.8, rx, ry, tilt, harmonics)
  })
  const fringes = [
    fringe(18 + rand() * 8, 22 + rand() * 6, 62, 14 + rand() * 8, 5 + rand() * 3, rand() * 4),
    fringe(12, 128 + rand() * 8, 58, 142, 4 + rand() * 3, rand() * 4),
    fringe(148, 118, 186, 132 + rand() * 6, 4 + rand() * 2, rand() * 4),
    fringe(156, 28, 188, 48 + rand() * 10, 3 + rand() * 3, rand() * 4),
  ]
  return { rings, fringes }
}

const hills = new Map<number, Hill>()

function hill(seed: number): Hill {
  const cached = hills.get(seed)
  if (cached) return cached
  const drawn = drawHill(seed)
  hills.set(seed, drawn)
  return drawn
}

type ContourNestProps = {
  seed: number
  motion: 'warp' | 'still'
  className: string
}

export function ContourNest({ seed, motion, className }: ContourNestProps) {
  const drawn = hill(seed)
  const live = motion === 'warp'
  return (
    <svg className={`contour-nest ${className}`} viewBox="0 0 200 160" aria-hidden="true">
      <g className={live ? 'contour-warp' : undefined}>
        {drawn.rings.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
      <g className={live ? 'contour-fringe' : undefined}>
        {drawn.fringes.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
    </svg>
  )
}

export function TitleContours() {
  return <ContourNest seed={19} motion="warp" className="title-contours" />
}

export function FieldContours() {
  return <ContourNest seed={73} motion="still" className="field-contours" />
}
