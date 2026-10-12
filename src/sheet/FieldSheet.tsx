import { useState } from 'react'
import { mediumLabels, usesPigment, type FieldCard, type Location, type Medium } from '../../shared/contract.ts'
import { PlacePreview } from '../explore/Explorer.tsx'
import { usePaneScroll } from '../scroll/usePaneScroll.ts'
import { distanceMeters, formatDistance, type StudyKind } from '../../shared/studies.ts'

type FieldSheetProps = {
  location: Location
  medium: Medium
  card: FieldCard | null
  weatherLine: string
  notice: string | null
  planNote: string | null
  planFromGemma: boolean
  here: { longitude: number; latitude: number } | null
  busy: 'card' | 'voice' | null
  onClose: () => void
  onWrite: () => void
  onListen: () => void
  onFindHere: () => void
  kind: StudyKind | null
}

function walkingDirections(from: { longitude: number; latitude: number } | null, to: Location): string {
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  if (from) url.searchParams.set('origin', `${from.latitude},${from.longitude}`)
  url.searchParams.set('destination', `${to.latitude},${to.longitude}`)
  url.searchParams.set('travelmode', 'walking')
  return url.toString()
}

export function FieldSheet({
  location,
  medium,
  card,
  weatherLine,
  notice,
  planNote,
  planFromGemma,
  here,
  busy,
  onClose,
  onWrite,
  onListen,
  onFindHere,
  kind,
}: FieldSheetProps) {
  const [pane, setPane] = useState<HTMLElement | null>(null)
  usePaneScroll(pane)
  const study = card ?? null
  const pigment = usesPigment(medium)
  const fromHere = here
    ? distanceMeters(here.latitude, here.longitude, location.latitude, location.longitude)
    : null
  const values = study?.values ?? ['Light', 'Middle', 'Dark']
  const palette = study && pigment ? study.palette : []

  return (
    <section className={busy ? 'sheet is-busy' : 'sheet'} aria-label="Field study" ref={setPane}>
      <div className="sheet-body">
      <div className="sheet-top">
        <p className="eyebrow">{mediumLabels[medium]}</p>
        <button type="button" className="text-button" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="study-hero">
        {kind ? <PlacePreview kind={kind} name={study?.placeName ?? location.name} /> : null}
        <div>
          <h2>{study?.placeName ?? location.name}</h2>
          <p className="weather">{study?.weatherLine || weatherLine || 'Reading the light…'}</p>
        </div>
      </div>
      <p className="directions">
        {fromHere === null ? null : fromHere < 40 ? 'You are at this place.' : `${formatDistance(fromHere)} from you.`}
        <a href={walkingDirections(here, location)} target="_blank" rel="noopener noreferrer">
          Walking directions
        </a>
        {here ? null : (
          <button type="button" className="text-button" onClick={onFindHere}>
            Show where I am
          </button>
        )}
      </p>
      {planNote ? (
        <p className={planFromGemma ? 'plan-note is-live' : 'plan-note'} role="status">
          {planNote}
        </p>
      ) : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <p className="field-label">Suggested values</p>
      <p className="hint-inline">Light, middle, and dark are starting tones for the page. You choose what stays.</p>
      <div className="values" aria-label="Suggested values">
        {['Light', 'Middle', 'Dark'].map((label, index) => (
          <div key={label} className={`value value-${index + 1}`}>
            <span className="value-name">{label}</span>
            <span>{values[index] ?? label}</span>
          </div>
        ))}
      </div>

      {pigment ? (
        <>
          <p className="field-label">Suggested pigments</p>
          <div className="swatches" aria-label="Suggested pigments">
            {(palette.length ? palette : ['#d4532b', '#1f6b56', '#2f4d6e']).map((color) => (
              <div key={color} className="swatch" style={{ background: color }}>
                <span>{color}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <p className="motif">{study?.motif ?? 'A plan for the light and the shapes in front of you.'}</p>
      <p className="subject">
        {study?.subject ?? 'Ask for a plan when you want a starting look. You still decide what to keep and what to leave out.'}
      </p>
      {study ? <p className="leave">{study.leaveBefore}</p> : null}

      {busy === 'card' ? (
        <div className="work" role="status">
          <span className="ink-spin" />
          <p>Writing a plan for this place.</p>
        </div>
      ) : null}
      {busy === 'voice' ? (
        <div className="work" role="status">
          <span className="voice-spin" />
          <p>Reading this plan aloud.</p>
        </div>
      ) : null}

      <div className="sheet-actions">
        <button type="button" className="primary" onClick={onWrite} disabled={busy !== null}>
          {busy === 'card' ? 'Writing a plan…' : 'Suggest a plan'}
        </button>
        <button type="button" className="secondary" onClick={onListen} disabled={busy !== null}>
          {busy === 'voice' ? 'Playing…' : 'Hear this plan'}
        </button>
      </div>
      </div>
    </section>
  )
}
