import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { placePhoto } from '../photos.ts'
import { usePaneScroll } from '../scroll/usePaneScroll.ts'
import {
  distanceChoices,
  feelLabels,
  feelWords,
  interestIds,
  interestLabels,
  reachLine,
  type DistanceId,
  type FeelWord,
  type InterestId,
  type Study,
  type StudyKind,
} from '../../shared/studies.ts'
import { kindLabel } from '../library.ts'
import { BackMark, MapMark } from '../icons/glyphs.tsx'
import { ReachMark } from '../icons/marks.tsx'

const palettes: Record<StudyKind, [string, string, string]> = {
  water: ['#e7f2ef', '#7eb0b8', '#1d4e5c'],
  park: ['#e7f0dc', '#6f8f55', '#1f6b56'],
  viewpoint: ['#f6e6d4', '#d4532b', '#2c4a68'],
  architecture: ['#f3ecdf', '#8a7360', '#2a2723'],
  hill: ['#f3ead8', '#8d9378', '#3e4a38'],
}

type PreviewProps = { kind: StudyKind; name: string; latitude: number; longitude: number }

export function PlacePreview({ kind, name, latitude, longitude }: PreviewProps) {
  const [photo, setPhoto] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void placePhoto(latitude, longitude, kind, name).then((source) => {
      if (live) setPhoto(source)
    })
    return () => {
      live = false
    }
  }, [latitude, longitude, kind, name])

  if (photo) return <img className="study-art" src={photo} alt="" />
  return <StudyArt kind={kind} />
}

function Contours({ stroke }: { stroke: string }) {
  return (
    <g fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="1.2">
      <path d="M-4 30 C30 18 52 34 84 24 S140 8 164 18" />
      <path d="M-4 42 C28 32 56 46 88 36 S138 22 164 30" />
      <path d="M-4 54 C26 46 60 58 92 48 S136 36 164 42" />
    </g>
  )
}

export function StudyArt({ kind }: { kind: StudyKind }) {
  const [paper, mid, dark] = palettes[kind]
  if (kind === 'water') {
    return (
      <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
        <rect width="160" height="100" fill={paper} />
        <Contours stroke={dark} />
        <circle cx="124" cy="28" r="10" fill={mid} />
        <path d="M0 58 C28 50 48 66 80 58 C112 50 132 66 160 58 V100 H0 Z" fill={mid} />
        <path d="M0 74 C30 66 52 82 84 74 C116 66 136 82 160 74 V100 H0 Z" fill={dark} />
      </svg>
    )
  }
  if (kind === 'park') {
    return (
      <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
        <rect width="160" height="100" fill={paper} />
        <Contours stroke={dark} />
        <rect y="72" width="160" height="28" fill={mid} />
        <circle cx="42" cy="58" r="24" fill={dark} />
        <circle cx="78" cy="48" r="28" fill={mid} />
        <circle cx="112" cy="60" r="22" fill={dark} />
      </svg>
    )
  }
  if (kind === 'architecture') {
    return (
      <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
        <rect width="160" height="100" fill={paper} />
        <Contours stroke={dark} />
        <rect x="78" y="28" width="58" height="72" fill={mid} />
        <rect x="28" y="46" width="46" height="54" fill={dark} />
        <rect x="40" y="58" width="14" height="18" fill={paper} />
        <rect x="96" y="42" width="16" height="22" fill={paper} />
      </svg>
    )
  }
  if (kind === 'hill') {
    return (
      <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
        <rect width="160" height="100" fill={paper} />
        <Contours stroke={dark} />
        <path d="M0 78 L46 40 L78 68 L160 28 V100 H0 Z" fill={mid} />
        <path d="M0 88 L58 62 L104 84 L160 58 V100 H0 Z" fill={dark} />
      </svg>
    )
  }
  return (
    <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
      <rect width="160" height="62" fill={dark} />
      <rect y="62" width="160" height="38" fill={paper} />
      <Contours stroke={paper} />
      <path d="M0 62 L36 44 L70 62 L108 36 L160 62 Z" fill={mid} />
      <circle cx="28" cy="22" r="8" fill={paper} />
    </svg>
  )
}

function InterestGate({
  initial,
  onSave,
}: {
  initial: InterestId[]
  onSave: (ids: InterestId[]) => void
}) {
  const [picked, setPicked] = useState<InterestId[]>(initial)
  function toggle(id: InterestId) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }
  return (
    <section className="gate" aria-label="What would you like to study today">
      <p className="eyebrow">Before the walk</p>
      <h2>What would you like to study today?</h2>
      <p className="gate-copy">Pick what you want to study. Places near you line up from that.</p>
      <div className="chips" role="group" aria-label="Interests">
        {interestIds.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={picked.includes(id)}
            className={picked.includes(id) ? 'is-on' : ''}
            onClick={() => toggle(id)}
          >
            {interestLabels[id]}
          </button>
        ))}
      </div>
      <button type="button" className="primary" disabled={picked.length === 0} onClick={() => onSave(picked)}>
        <MapMark />
        Show the area
      </button>
    </section>
  )
}

type ExplorerProps = {
  interests: InterestId[]
  editing: boolean
  onSaveInterests: (ids: InterestId[]) => void
  onEditInterests: () => void
  distance: DistanceId
  onDistance: (id: DistanceId) => void
  feel: FeelWord | null
  onFeel: (feel: FeelWord | null) => void
  onPrompt: (text: string) => void
  studies: Study[]
  hoverId: string | null
  bestId: string | null
  promptActive: boolean
  loading: boolean
  hasArea: boolean
  notice: string | null
  onHover: (id: string | null) => void
  onOpen: (study: Study) => void
  onUseMap: () => void
  listReveal: number
}

type Snap = 'peek' | 'half' | 'full'
const snapOrder: Snap[] = ['peek', 'half', 'full']

function snapHeights(): Record<Snap, number> {
  const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const barBottom = document.querySelector('.bar')?.getBoundingClientRect().bottom ?? 120
  const full = Math.max(window.innerHeight - barBottom - 12, 16 * rem)
  return { peek: 13.5 * rem, half: Math.min(window.innerHeight * 0.56, full), full }
}

export function Explorer({
  interests,
  editing,
  onSaveInterests,
  onEditInterests,
  distance,
  onDistance,
  feel,
  onFeel,
  onPrompt,
  studies,
  hoverId,
  bestId,
  promptActive,
  loading,
  hasArea,
  notice,
  onHover,
  onOpen,
  onUseMap,
  listReveal,
}: ExplorerProps) {
  const [draft, setDraft] = useState('')
  const [refine, setRefine] = useState(false)
  const [snap, setSnap] = useState<Snap>('half')
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ y: number; height: number; moved: boolean } | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const [rail, setRail] = useState<HTMLDivElement | null>(null)
  usePaneScroll(rail)

  const seenReveal = useRef(listReveal)
  useEffect(() => {
    if (seenReveal.current === listReveal) return
    seenReveal.current = listReveal
    setSnap('half')
    rail?.scrollTo({ top: 0 })
  }, [listReveal, rail])

  useEffect(() => {
    if (!hoverId || !rail) return
    // A pointer already on the list must not drag it. Scrolling is for a spot highlighted from the map.
    if (rail.matches(':hover')) return
    const node = rail.querySelector<HTMLElement>(`[data-study="${CSS.escape(hoverId)}"]`)
    if (!node) return
    const top = node.offsetTop
    if (top < rail.scrollTop || top + node.offsetHeight > rail.scrollTop + rail.clientHeight) {
      rail.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' })
    }
  }, [hoverId, rail])

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    const section = sectionRef.current
    if (!section) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { y: event.clientY, height: section.getBoundingClientRect().height, moved: false }
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state) return
    const delta = state.y - event.clientY
    if (Math.abs(delta) > 4) state.moved = true
    if (!state.moved) return
    const heights = snapHeights()
    setDragHeight(Math.min(heights.full, Math.max(heights.peek * 0.8, state.height + delta)))
  }

  function endDrag() {
    const state = drag.current
    drag.current = null
    if (!state) return
    if (!state.moved) {
      setSnap((current) => (current === 'peek' ? 'half' : current === 'half' ? 'full' : 'peek'))
      return
    }
    const heights = snapHeights()
    const current = dragHeight ?? state.height
    const nearest = snapOrder.reduce((best, item) =>
      Math.abs(heights[item] - current) < Math.abs(heights[best] - current) ? item : best,
    )
    setSnap(nearest)
    setDragHeight(null)
  }

  if (editing || interests.length === 0) {
    return <InterestGate initial={interests} onSave={onSaveInterests} />
  }

  return (
    <section
      className={dragHeight === null ? 'explorer' : 'explorer is-dragging'}
      aria-label="Places to study"
      data-snap={snap}
      ref={sectionRef}
      style={dragHeight === null ? undefined : { height: `${dragHeight}px` }}
    >
      <button
        type="button"
        className="sheet-handle"
        aria-label={`Places list, ${snap === 'full' ? 'full height' : snap === 'half' ? 'half height' : 'collapsed'}. Tap to resize.`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span aria-hidden="true" />
      </button>
      <div className="explorer-nav">
        <button type="button" className="back-button" aria-label="Back" onClick={onEditInterests}>
          <BackMark />
        </button>
        <button type="button" className="use-map" onClick={onUseMap}>
          <MapMark />
          Use the map
        </button>
        <button
          type="button"
          className="text-button"
          aria-expanded={refine}
          onClick={() => setRefine((open) => !open)}
        >
          Refine
        </button>
      </div>
      {refine ? (
        <div className="refine-panel">
          <div className="chips" role="group" aria-label="Feel of the study">
            {feelWords.map((word) => (
              <button
                key={word}
                type="button"
                aria-pressed={feel === word}
                className={feel === word ? 'is-on' : ''}
                onClick={() => onFeel(feel === word ? null : word)}
              >
                {feelLabels[word]}
              </button>
            ))}
          </div>
          <form
            className="search prompt"
            onSubmit={(event) => {
              event.preventDefault()
              onPrompt(draft.trim())
            }}
          >
            <label className="field-label" htmlFor="study-prompt">
              What to match
            </label>
            <input
              id="study-prompt"
              value={draft}
              maxLength={160}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Light, subject, or mood"
              autoComplete="off"
            />
            <button type="submit">Match</button>
          </form>
        </div>
      ) : null}
      <div className="explorer-row reach">
        <p className="field-label" id="reach-label">
          How far to look
        </p>
        <div className="chips" role="radiogroup" aria-labelledby="reach-label">
          {distanceChoices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={distance === choice.id}
              className={distance === choice.id ? 'is-on' : ''}
              onClick={() => onDistance(choice.id)}
            >
              <ReachMark id={choice.id} />
              {choice.label}
            </button>
          ))}
        </div>
      </div>
      {notice ? <p className="explorer-note">{notice}</p> : null}
      {!loading && studies.length === 0 && !notice ? (
        <p className="explorer-note">
          {hasArea
            ? 'Nothing named is this close. Try a ride or a drive, or open Refine.'
            : 'Location is off. Use Near me, or search a place. Nothing is loaded until then.'}
        </p>
      ) : null}
      <div className="rail" ref={setRail}>
        <div className="rail-content" aria-busy={loading}>
          {loading
            ? [0, 1, 2].map((item) => (
                <div key={item} className="preview is-ghost" aria-hidden="true">
                  <span className="study-art" />
                  <span className="preview-copy">
                    <span className="ghost-line" />
                    <span className="ghost-line is-short" />
                  </span>
                </div>
              ))
            : studies.map((study) => {
                const best = study.id === bestId
                const hovered = study.id === hoverId
                return (
                  <button
                    key={study.id}
                    type="button"
                    data-study={study.id}
                    className={hovered ? 'preview is-hovered' : 'preview'}
                    onClick={() => onOpen(study)}
                    onMouseEnter={() => onHover(study.id)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(study.id)}
                    onBlur={() => onHover(null)}
                  >
                    <PlacePreview kind={study.kind} name={study.name} latitude={study.latitude} longitude={study.longitude} />
                    <span className="preview-copy">
                      <h3>{study.name}</h3>
                      <p>
                        {hasArea ? reachLine(study.distanceMeters) : 'Near you'} · {kindLabel(study.kind)}
                        {best ? (
                          <span className="preview-best">{promptActive ? 'Closest to that' : 'Best today'}</span>
                        ) : null}
                      </p>
                    </span>
                  </button>
                )
              })}
        </div>
      </div>
      {loading ? <p className="sr" role="status">Looking for places nearby</p> : null}
    </section>
  )
}
