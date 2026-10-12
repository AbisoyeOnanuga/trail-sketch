import { useState } from 'react'
import { mediumLabels, usesPigment, type FieldCard, type Location, type Medium } from '../../shared/contract.ts'
import { PlacePreview } from '../explore/Explorer.tsx'
import { usePaneScroll } from '../scroll/usePaneScroll.ts'
import type { StudyKind } from '../../shared/studies.ts'

type FieldSheetProps = {
  location: Location
  medium: Medium
  card: FieldCard | null
  weatherLine: string
  notice: string | null
  busy: 'card' | 'voice' | null
  onClose: () => void
  onWrite: () => void
  onListen: () => void
  kind: StudyKind | null
}

export function FieldSheet({
  location,
  medium,
  card,
  weatherLine,
  notice,
  busy,
  onClose,
  onWrite,
  onListen,
  kind,
}: FieldSheetProps) {
  const [pane, setPane] = useState<HTMLElement | null>(null)
  usePaneScroll(pane)
  const study = card ?? null
  const pigment = usesPigment(medium)
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
      {notice ? <p className="notice">{notice}</p> : null}
      {study?.source === 'sample' ? <p className="sample-flag">Sample study</p> : null}

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
        <button type="button" className="secondary" onClick={onListen} disabled={busy !== null || !study}>
          {busy === 'voice' ? 'Playing…' : 'Hear this plan'}
        </button>
      </div>
      </div>
    </section>
  )
}
