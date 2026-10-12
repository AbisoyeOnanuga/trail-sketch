import type { StudyKind } from '../../shared/studies.ts'

export const pinMarkup: Record<StudyKind, string> = {
  water: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#e7f2ef"/><path d="M0 14h32v18H0z" fill="#7eb0b8"/><path d="M0 20c4 3 8-3 12 0s8 3 12 0 8-3 8 0v12H0z" fill="#1d4e5c"/><circle cx="24" cy="8" r="3" fill="#d7c4a3"/></svg>`,
  park: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#e7f0dc"/><rect y="22" width="32" height="10" fill="#6f8f55"/><circle cx="9" cy="18" r="6" fill="#1f6b56"/><circle cx="16" cy="14" r="7" fill="#3d7a52"/><circle cx="23" cy="18" r="5.5" fill="#1f6b56"/></svg>`,
  viewpoint: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="18" fill="#2c4a68"/><rect y="18" width="32" height="14" fill="#f6e6d4"/><path d="M0 20 L8 14 L16 20 L24 12 L32 20 V32 H0z" fill="#d4532b"/><circle cx="8" cy="7" r="2.4" fill="#f6e6d4"/></svg>`,
  architecture: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#f3ecdf"/><rect x="17" y="8" width="11" height="24" fill="#8a7360"/><rect x="4" y="14" width="12" height="18" fill="#2a2723"/><rect x="7" y="18" width="4" height="5" fill="#f3ecdf"/><rect x="20" y="13" width="4" height="6" fill="#f3ecdf"/></svg>`,
  hill: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#f3ead8"/><path d="M0 24 L10 12 L18 22 L32 8 V32 H0z" fill="#8d9378"/><path d="M0 28 L12 18 L22 28 L32 16 V32 H0z" fill="#3e4a38"/></svg>`,
}
