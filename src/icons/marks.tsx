export function MediumMark({ medium }: { medium: string }) {
  if (medium === 'ink') {
    return (
      <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 13 L8 2 L10 2 L5 13z" fill="currentColor" />
        <path d="M9 3c2 1 3 3 2 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    )
  }
  if (medium === 'watercolor') {
    return (
      <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 2c2 3 5 4 5 8a5 5 0 1 1-10 0c0-4 3-5 5-8z" fill="currentColor" />
      </svg>
    )
  }
  if (medium === 'oil') {
    return (
      <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="9" width="12" height="4" rx="1" fill="currentColor" />
        <path d="M4 9c1-4 7-4 8 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    )
  }
  return (
    <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 12 L11 3 l2 2 L4 14z" fill="currentColor" />
      <path d="M10 4 l2 2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
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

export function LocateMark() {
  return (
    <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" fill="currentColor" />
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export function LibraryMark() {
  return (
    <svg className="mark-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 2h7l3 3v9H3z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8h4M6 11h4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
