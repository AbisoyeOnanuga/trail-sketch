import { useEffect, useRef, useState } from 'react'
import { usePaneScroll } from '../scroll/usePaneScroll.ts'
import { loadGoogleClientId, verifyGoogle } from '../api.ts'
import { kindLabel, mediumName, type GoogleProfile, type Visit, visitStamp, writeProfile } from '../library.ts'

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void
      renderButton: (parent: HTMLElement, options: { theme: string; size: string; text: string; width: number }) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleAccounts
  }
}

type LibrarySheetProps = {
  visits: Visit[]
  profile: GoogleProfile | null
  onProfile: (profile: GoogleProfile | null) => void
  onClose: () => void
  onOpen: (visit: Visit) => void
  onDelete: (visit: Visit) => void
}

export function LibrarySheet({ visits, profile, onProfile, onClose, onOpen, onDelete }: LibrarySheetProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [pane, setPane] = useState<HTMLElement | null>(null)
  usePaneScroll(pane)
  const [clientId, setClientId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    void loadGoogleClientId().then(setClientId)
  }, [])

  useEffect(() => {
    const parent = buttonRef.current
    if (!parent || !clientId || profile) return
    let cancelled = false
    const render = () => {
      if (cancelled || !window.google || !buttonRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const credential = response.credential ?? ''
          void verifyGoogle(credential)
            .then((next) => {
              writeProfile(next)
              onProfile(next)
              setNotice(null)
            })
            .catch(() => setNotice('Google did not confirm that sign-in.'))
        },
      })
      buttonRef.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'medium',
        text: 'signin_with',
        width: 240,
      })
    }
    if (window.google) {
      render()
      return
    }
    const existing = document.querySelector('script[data-trail-google="1"]')
    if (existing) {
      existing.addEventListener('load', render)
      return () => {
        cancelled = true
        existing.removeEventListener('load', render)
      }
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.trailGoogle = '1'
    script.onload = render
    document.head.appendChild(script)
    return () => {
      cancelled = true
    }
  }, [clientId, profile, onProfile])

  return (
    <section className="sheet library" aria-label="Studied places" ref={setPane}>
      <div className="sheet-body">
      <div className="sheet-top">
        <p className="eyebrow">Library</p>
        <button type="button" className="text-button" onClick={onClose}>
          Close
        </button>
      </div>
      <h2>Places you have studied</h2>
      {profile ? (
        <p className="hint-inline">
          Signed in as {profile.name || profile.email}. These stays are kept on this phone under that Google account.
        </p>
      ) : (
        <p className="hint-inline">
          {clientId
            ? 'Sign in with Google to keep this library with your account on this phone.'
            : 'Studies are saved on this phone.'}
        </p>
      )}
      {profile ? (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            writeProfile(null)
            onProfile(null)
          }}
        >
          Sign out
        </button>
      ) : clientId ? (
        <div ref={buttonRef} className="google-button" />
      ) : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {visits.length === 0 ? (
        <p className="subject">When you accept a place, the date, time, and what it is go here.</p>
      ) : (
        <ul className="visit-list">
          {visits.map((visit) => (
            <li key={`${visit.id}-${visit.studiedAt}`}>
              <button type="button" onClick={() => onOpen(visit)}>
                <span className={`pin-key pin-${visit.kind}`} aria-hidden="true" />
                <span>
                  <strong>{visit.name}</strong>
                  <small>
                    {kindLabel(visit.kind)} · {mediumName(visit.medium)} · {visitStamp(visit.studiedAt)}
                  </small>
                </span>
              </button>
              <button type="button" className="text-button" onClick={() => onDelete(visit)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
    </section>
  )
}
