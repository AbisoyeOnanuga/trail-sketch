import { mediumLabels, usesPigment, type FieldCard, type Location, type Medium } from '../../shared/contract.ts'

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
}: FieldSheetProps) {
  const study = card ?? null
  const pigment = usesPigment(medium)
  const values = study?.values ?? ['Light', 'Middle', 'Dark']
  const palette = study && pigment ? study.palette : []

  return (
    <section className="sheet" aria-label="Field study">
      <div className="sheet-top">
        <p className="eyebrow">{mediumLabels[medium]}</p>
        <button type="button" className="text-button" onClick={onClose}>
          Close
        </button>
      </div>
      <h2>{study?.placeName ?? location.name}</h2>
      <p className="weather">{study?.weatherLine || weatherLine || 'Reading the light…'}</p>
      {notice ? <p className="notice">{notice}</p> : null}
      {study?.source === 'sample' ? <p className="sample-flag">Sample study</p> : null}

      <div className="values" aria-label="Value study">
        {values.map((step, index) => (
          <div key={`${step}-${index}`} className={`value value-${index + 1}`}>
            <span>{step}</span>
          </div>
        ))}
      </div>

      {pigment ? (
        <div className="swatches" aria-label="Pigment study">
          {(palette.length ? palette : ['#d4532b', '#1f6b56', '#2f4d6e']).map((color) => (
            <div key={color} className="swatch" style={{ background: color }}>
              <span>{color}</span>
            </div>
          ))}
        </div>
      ) : null}

      <p className="motif">{study?.motif ?? 'Write a study when you are ready to look.'}</p>
      <p className="subject">{study?.subject ?? 'The note will say what to draw or paint, and what to leave out.'}</p>
      {study ? <p className="leave">{study.leaveBefore}</p> : null}

      <div className="sheet-actions">
        <button type="button" className="primary" onClick={onWrite} disabled={busy !== null}>
          {busy === 'card' ? 'Writing…' : 'Write the study'}
        </button>
        <button type="button" className="secondary" onClick={onListen} disabled={busy !== null || !study}>
          {busy === 'voice' ? 'Reading…' : 'Read it to me'}
        </button>
      </div>
    </section>
  )
}
