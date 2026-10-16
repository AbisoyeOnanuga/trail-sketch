import { useEffect, useState } from 'react'
import { mediumPhrases, usesPigment, type FieldCard, type Location, type Medium } from '../../shared/contract.ts'
import { placeSeed, toneNotes } from '../plan/fallback.ts'
import { PlacePreview } from '../explore/Explorer.tsx'
import { usePaneScroll } from '../scroll/usePaneScroll.ts'
import { CloseMark, DirectionsMark, HearMark, LocateMark, PlanMark } from '../icons/glyphs.tsx'
import {
  inkChoices,
  inkGrades,
  mixOnPaper,
  namePigments,
  pigmentsForKind,
  suggestInk,
  textOn,
  type InkId,
} from '../pigments.ts'
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
  const [pickedInk, setPickedInk] = useState<InkId | null>(null)
  useEffect(() => {
    setPickedInk(null)
  }, [location.latitude, location.longitude])
  const inkId = pickedInk ?? suggestInk(kind, weatherLine || study?.weatherLine || '')
  const ink = inkChoices.find((item) => item.id === inkId) ?? inkChoices[0]
  const pigments = pigment
    ? study && study.palette.length
      ? namePigments(study.palette)
      : pigmentsForKind(kind, weatherLine, placeSeed(location))
    : []
  const fromHere = here
    ? distanceMeters(here.latitude, here.longitude, location.latitude, location.longitude)
    : null
  const defaults = toneNotes(kind)
  const tones = defaults.map((fallback, index) => {
    const note = study?.values[index]?.trim() ?? ''
    return note && !/^(light|middle|mid|dark)\.?$/i.test(note) ? note : fallback
  })

  return (
    <section className={busy ? 'sheet is-busy' : 'sheet'} aria-label="Field study" ref={setPane}>
      <div className="sheet-body">
      <div className="sheet-top">
        <p className="eyebrow">{mediumPhrases[medium]}</p>
        <button type="button" className="text-button" onClick={onClose}>
          <CloseMark />
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
          <DirectionsMark />
          Walking directions
        </a>
        {here ? null : (
          <button type="button" className="text-button" onClick={onFindHere}>
            <LocateMark />
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

      <p className="field-label">Suggested tones for your study</p>
      <p className="hint-inline">Lightest to darkest, and what holds each tone here. Starting points; you choose what stays.</p>
      <ol className="values" aria-label="Suggested tones">
        {tones.map((note, index) => (
          <li key={index} className={`value value-${index + 1}`}>
            <span className="value-step" aria-hidden="true">
              {index + 1}
            </span>
            <span>{note}</span>
          </li>
        ))}
      </ol>

      {pigment ? (
        <>
          <p className="field-label">Suggested pigments</p>
          <p className="hint-inline">Named colors for this place. The lettering stays readable on each swatch.</p>
          <div className="swatches" aria-label="Suggested pigments">
            {pigments.map((item) => (
              <div key={item.name} className="swatch" style={{ background: item.hex, color: textOn(item.hex) }}>
                <span className="value-name">{item.name}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {medium === 'ink' ? (
        <>
          <p className="field-label">Ink</p>
          <p className="hint-inline">
            Grades are washes of one ink, from thin to full. The place suggests a starting ink. You choose.
          </p>
          <div className="ink-row" role="radiogroup" aria-label="Ink color">
            {inkChoices.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={inkId === item.id}
                className={inkId === item.id ? 'is-on' : ''}
                onClick={() => setPickedInk(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="swatches" aria-label="Ink grades">
            {inkGrades.map((grade) => {
              const color = mixOnPaper(ink.hex, grade.amount)
              return (
                <div key={grade.name} className="swatch" style={{ background: color, color: textOn(color) }}>
                  <span className="value-name">{grade.name}</span>
                  <span>{ink.name}</span>
                </div>
              )
            })}
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
            <PlanMark />
            {busy === 'card' ? 'Writing a plan…' : 'Suggest a plan'}
          </button>
          <button type="button" className="secondary" onClick={onListen} disabled={busy !== null}>
            <HearMark />
            {busy === 'voice' ? 'Playing…' : 'Hear this plan'}
          </button>
      </div>
      </div>
    </section>
  )
}
