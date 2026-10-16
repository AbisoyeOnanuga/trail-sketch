const mediumEmoji: Record<string, string> = {
  graphite: '✏️',
  charcoal: '🖍️',
  ink: '🖊️',
  watercolor: '💧',
  gouache: '🖌️',
  oil: '🎨',
}

export function MediumMark({ medium }: { medium: string }) {
  return (
    <span className="mark-emoji" aria-hidden="true">
      {mediumEmoji[medium] ?? '✏️'}
    </span>
  )
}

export function ReachMark({ id }: { id: string }) {
  if (id === 'walk') {
    return (
      <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="3" r="1.4" fill="currentColor" />
        <path d="M8 5 L6 9 L8 9 L7 14 M8 9 L11 8 L12 11 M8 7 L5 8" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  if (id === 'hike') {
    return (
      <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M1 13 L6 6 L9 10 L15 3 V13z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2" fill="currentColor" />
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
