import type { ReactNode } from 'react'

// Stroke icons from Lucide, ISC license. https://lucide.dev

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="mark-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function BackMark() {
  return (
    <Glyph>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Glyph>
  )
}

export function MapMark() {
  return (
    <Glyph>
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </Glyph>
  )
}

export function PlanMark() {
  return (
    <Glyph>
      <path d="M13 21h8" />
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </Glyph>
  )
}

export function HearMark() {
  return (
    <Glyph>
      <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
      <path d="M16 9a5 5 0 0 1 0 6" />
      <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
    </Glyph>
  )
}

export function CloseMark() {
  return (
    <Glyph>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Glyph>
  )
}

export function PlacesMark() {
  return (
    <Glyph>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </Glyph>
  )
}

export function LocateMark() {
  return (
    <Glyph>
      <line x1="2" x2="5" y1="12" y2="12" />
      <line x1="19" x2="22" y1="12" y2="12" />
      <line x1="12" x2="12" y1="2" y2="5" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
    </Glyph>
  )
}

export function DirectionsMark() {
  return (
    <Glyph>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </Glyph>
  )
}

export function LibraryMark() {
  return (
    <Glyph>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </Glyph>
  )
}

export function HideMark() {
  return (
    <Glyph>
      <path d="m6 9 6 6 6-6" />
    </Glyph>
  )
}
