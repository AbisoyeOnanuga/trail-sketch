import { useEffect, useRef, useState } from 'react'
import {
  distanceChoices,
  feelLabels,
  feelWords,
  formatDistance,
  interestIds,
  interestLabels,
  reachLabel,
  type DistanceId,
  type FeelWord,
  type InterestId,
  type Study,
  type StudyKind,
} from '../../shared/studies.ts'
import { ReachMark } from '../icons/marks.tsx'

const palettes: Record<StudyKind, [string, string, string]> = {
  water: ['#e7f2ef', '#7eb0b8', '#1d4e5c'],
  park: ['#e7f0dc', '#6f8f55', '#1f6b56'],
  viewpoint: ['#f6e6d4', '#d4532b', '#2c4a68'],
  architecture: ['#f3ecdf', '#8a7360', '#2a2723'],
  hill: ['#f3ead8', '#8d9378', '#3e4a38'],
}

export function StudyArt({ kind }: { kind: StudyKind }) {
  const [paper, mid, dark] = palettes[kind]
  if (kind === 'water') {
    return (
      <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
        <rect width="160" height="100" fill={paper} />
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
        <path d="M0 78 L46 40 L78 68 L160 28 V100 H0 Z" fill={mid} />
        <path d="M0 88 L58 62 L104 84 L160 58 V100 H0 Z" fill={dark} />
      </svg>
    )
  }
  return (
    <svg className="study-art" viewBox="0 0 160 100" aria-hidden="true">
      <rect width="160" height="62" fill={dark} />
      <rect y="62" width="160" height="38" fill={paper} />
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
    <section className="gate" aria-label="What you look for">
      <p className="eyebrow">Before the walk</p>
      <h2>What do you look for?</h2>
      <p className="gate-copy">Pick the things you want to study. The places around you line up from that.</p>
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
  focusedId: string | null
  bestId: string | null
  promptActive: boolean
  loading: boolean
  hasArea: boolean
  notice: string | null
  onFocus: (study: Study) => void
  onOpen: (study: Study) => void
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
  focusedId,
  bestId,
  promptActive,
  loading,
  hasArea,
  notice,
  onFocus,
  onOpen,
}: ExplorerProps) {
  const [draft, setDraft] = useState('')
  const bestRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const node = bestRef.current
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [bestId, studies])

  if (editing || interests.length === 0) {
    return <InterestGate initial={interests} onSave={onSaveInterests} />
  }

  return (
    <section className="explorer" aria-label="Places to study">
      <div className="explorer-row">
        <div className="chips" role="radiogroup" aria-label="How far">
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
        <button type="button" className="text-button" onClick={onEditInterests}>
          Interests
        </button>
      </div>
      <div className="chips feel-row" role="group" aria-label="Feel of the study">
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
      {notice ? <p className="explorer-note">{notice}</p> : null}
      {loading ? <p className="explorer-note">Looking around…</p> : null}
      {!loading && studies.length === 0 && !notice ? (
        <p className="explorer-note">
          {hasArea
            ? 'Nothing named is this close. Try a hike, or describe a subject.'
            : 'Location is off. These are farther trips, or describe a subject nearby.'}
        </p>
      ) : null}
      {studies.length > 2 ? <p className="scroll-cue">More places follow in this list.</p> : null}
      <div className="rail">
        {studies.map((study) => {
          const focused = study.id === focusedId
          const best = study.id === bestId
          return (
            <button
              key={study.id}
              type="button"
              className={focused ? 'preview is-focused' : 'preview'}
              ref={best ? bestRef : undefined}
              onClick={() => (focused ? onOpen(study) : onFocus(study))}
            >
              <StudyArt kind={study.kind} />
              <span className="preview-copy">
                <p className="eyebrow">{feelLabels[study.feel]}</p>
                <h3>{study.name}</h3>
                <p>
                  {hasArea ? `${reachLabel(study.distanceMeters)} · ${formatDistance(study.distanceMeters)}` : 'A trip'}
                  {best ? ` · ${promptActive ? 'Closest to that' : 'Fits what you look for'}` : ''}
                </p>
                <p className="preview-action">{focused ? 'Study this place' : 'Select'}</p>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
