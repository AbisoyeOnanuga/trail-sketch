import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { loadTerrain } from '../api.ts'
import {
  contourLines,
  fieldSpan,
  fieldSteps,
  fieldWarp,
  generatedField,
  titleSteps,
  titleWarp,
  warpPath,
  type ContourLine,
} from './isolines.ts'

const GRID = 8
const terrainStore = new Map<string, number[] | null>()
const terrainListeners = new Set<() => void>()

function subscribeTerrain(listen: () => void): () => void {
  terrainListeners.add(listen)
  return () => terrainListeners.delete(listen)
}

function terrainKey(latitude?: number, longitude?: number): string {
  if (latitude == null || longitude == null) return ''
  return `${(Math.round(latitude * 100) / 100).toFixed(2)}:${(Math.round(longitude * 100) / 100).toFixed(2)}`
}

function useElevation(latitude?: number, longitude?: number): number[] | null {
  const key = terrainKey(latitude, longitude)
  useEffect(() => {
    if (!key || terrainStore.has(key)) return
    let live = true
    const [lat, lon] = key.split(':').map(Number)
    void loadTerrain(lat, lon).then((next) => {
      if (!live) return
      terrainStore.set(key, next)
      for (const listen of terrainListeners) listen()
    })
    return () => {
      live = false
    }
  }, [key])
  return useSyncExternalStore(
    subscribeTerrain,
    () => (key ? (terrainStore.get(key) ?? null) : null),
    () => null,
  )
}

function placeSeed(latitude: number, longitude: number, salt: number): number {
  return (Math.round((latitude + 90) * 200) * 1000) ^ Math.round((longitude + 180) * 200) ^ salt
}

type Warp = { speed: number; amp: number; phase: number }

function ContourSheet({
  className,
  latitude,
  longitude,
  salt,
  warp,
  steps,
}: {
  className: string
  latitude?: number
  longitude?: number
  salt: number
  warp: Warp
  steps: number[]
}) {
  const elevation = useElevation(latitude, longitude)
  const lines = useMemo(() => {
    const real = elevation && fieldSpan(elevation) >= 4 ? elevation : null
    const seed = latitude == null || longitude == null ? salt : placeSeed(latitude, longitude, salt)
    const field = real ?? generatedField(seed, GRID)
    return contourLines(field, GRID, steps)
  }, [elevation, latitude, longitude, salt, steps])
  return <ContourSvg className={className} lines={lines} warp={warp} />
}

function ContourSvg({ className, lines, warp }: { className: string; lines: ContourLine[]; warp: Warp }) {
  const refs = useRef<Array<SVGPathElement | null>>([])
  const linesRef = useRef(lines)

  useEffect(() => {
    linesRef.current = lines
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const paint = (now: number) => {
      const time = media.matches ? 0 : now / 1000
      linesRef.current.forEach((line, index) => {
        const node = refs.current[index]
        if (!node) return
        node.setAttribute('d', warpPath(line.points, line.closed, time, warp))
      })
    }
    const loop = (now: number) => {
      paint(now)
      frame = window.requestAnimationFrame(loop)
    }
    const start = () => {
      window.cancelAnimationFrame(frame)
      if (media.matches || document.hidden) {
        paint(0)
        return
      }
      frame = window.requestAnimationFrame(loop)
    }
    media.addEventListener('change', start)
    document.addEventListener('visibilitychange', start)
    start()
    return () => {
      window.cancelAnimationFrame(frame)
      media.removeEventListener('change', start)
      document.removeEventListener('visibilitychange', start)
    }
  }, [warp, lines])

  return (
    <svg className={`contour-nest ${className}`} viewBox="0 0 200 160" aria-hidden="true">
      {lines.map((line, index) => (
        <path
          key={`${line.closed ? 'c' : 'o'}-${index}`}
          ref={(node) => {
            refs.current[index] = node
          }}
          d={warpPath(line.points, line.closed, 0, warp)}
        />
      ))}
    </svg>
  )
}

export function TitleContours({ latitude, longitude }: { latitude?: number; longitude?: number }) {
  return <ContourSheet className="title-contours" latitude={latitude} longitude={longitude} salt={19} warp={titleWarp} steps={titleSteps} />
}

export function FieldContours({ latitude, longitude }: { latitude?: number; longitude?: number }) {
  return <ContourSheet className="field-contours" latitude={latitude} longitude={longitude} salt={73} warp={fieldWarp} steps={fieldSteps} />
}
