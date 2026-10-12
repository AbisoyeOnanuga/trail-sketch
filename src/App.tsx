import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  errorCopy,
  loadPlace,
  readCachedCard,
  requestFieldCard,
  requestNarration,
  searchPlaces,
  writeCachedCard,
} from './api.ts'
import { spots } from './data/spots.ts'
import { MapView } from './map/MapView.tsx'
import { FieldSheet } from './sheet/FieldSheet.tsx'
import {
  mediumLabels,
  mediums,
  usesPigment,
  type FieldCard,
  type Location,
  type Medium,
} from '../shared/contract.ts'

function sampleCard(location: Location, medium: Medium, sky: string): FieldCard {
  const pigment = usesPigment(medium)
  return {
    placeName: location.name,
    longitude: location.longitude,
    latitude: location.latitude,
    medium,
    motif: pigment ? 'A color mass against a quiet ground' : 'One dark shape against a light field',
    values: ['Lit edge', 'Middle tone', 'The darkest note'],
    palette: pigment ? ['#d4532b', '#1f6b56', '#2f4d6e'] : [],
    subject:
      'This is a sample so the sheet has a shape before a live study. Stand where you will work, then write it again once Gemma is connected.',
    leaveBefore: 'Leave when the shadow of your hand crosses the motif.',
    spokenScript: `You are at ${location.name}. Look for one lit edge, a middle tone, and a single dark note. Draw or paint that, then put the phone away.`,
    weatherLine: sky || 'Light not read yet',
    generatedAt: new Date().toISOString(),
    source: 'sample',
  }
}

export default function App() {
  const [medium, setMedium] = useState<Medium>('graphite')
  const [selected, setSelected] = useState<Location | null>(null)
  const [card, setCard] = useState<FieldCard | null>(null)
  const [weather, setWeather] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Location[]>([])
  const [busy, setBusy] = useState<'card' | 'voice' | 'search' | null>(null)
  const [saved] = useState<FieldCard | null>(() => readCachedCard())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrl = useRef<string | null>(null)
  const chooseId = useRef(0)

  useEffect(() => {
    return () => {
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
    }
  }, [])

  const choose = useCallback(async (location: Location) => {
    const id = chooseId.current + 1
    chooseId.current = id
    setSelected(location)
    setCard(null)
    setNotice(null)
    setResults([])
    setWeather('')
    try {
      const place = await loadPlace(location.latitude, location.longitude)
      if (chooseId.current !== id) return
      setSelected({
        longitude: location.longitude,
        latitude: location.latitude,
        name: location.name === 'This spot' ? place.name : location.name,
      })
      setWeather(place.weatherLine)
    } catch (error) {
      if (chooseId.current !== id) return
      const code = error instanceof Error ? error.message : 'request_failed'
      setNotice(errorCopy[code] ?? errorCopy.request_failed)
    }
  }, [])

  async function onSearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    setBusy('search')
    setNotice(null)
    try {
      setResults(await searchPlaces(trimmed))
    } catch (error) {
      const code = error instanceof Error ? error.message : 'request_failed'
      setNotice(errorCopy[code] ?? errorCopy.request_failed)
      setResults([])
    } finally {
      setBusy(null)
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setNotice('This browser cannot share a location.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void choose({
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          name: 'This spot',
        })
      },
      () => setNotice('Location stayed off. Search a place or tap the map.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  async function writeStudy() {
    if (!selected) return
    setBusy('card')
    setNotice(null)
    try {
      const next = await requestFieldCard({ ...selected, medium })
      setCard(next)
      writeCachedCard(next)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'request_failed'
      if (code === 'missing_gemma_key') {
        setCard(sampleCard(selected, medium, weather))
      }
      setNotice(errorCopy[code] ?? errorCopy.request_failed)
    } finally {
      setBusy(null)
    }
  }

  async function listen() {
    if (!card) return
    setBusy('voice')
    setNotice(null)
    try {
      const blob = await requestNarration(card.spokenScript)
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
      const url = URL.createObjectURL(blob)
      audioUrl.current = url
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = url
      await audioRef.current.play()
    } catch (error) {
      const code = error instanceof Error ? error.message : 'request_failed'
      setNotice(errorCopy[code] ?? errorCopy.request_failed)
    } finally {
      setBusy(null)
    }
  }

  function changeMedium(next: Medium) {
    setMedium(next)
    setCard(null)
  }

  return (
    <div className="app">
      <header className="bar">
        <div className="brand">
          <p className="mark">Trail Sketch</p>
          <p className="tag">A field study for drawing and painting</p>
        </div>
        <form className="search" onSubmit={onSearch}>
          <label className="sr" htmlFor="place-search">
            Search a place
          </label>
          <input
            id="place-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Park, river, overlook"
            autoComplete="off"
          />
          <button type="submit" disabled={busy === 'search'}>
            {busy === 'search' ? '…' : 'Find'}
          </button>
        </form>
        <div className="mediums" role="radiogroup" aria-label="Medium">
          {mediums.map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={medium === item}
              className={medium === item ? 'is-on' : ''}
              onClick={() => changeMedium(item)}
            >
              {mediumLabels[item]}
            </button>
          ))}
        </div>
        <div className="bar-actions">
          <button type="button" className="locate" onClick={locate}>
            I am here
          </button>
          {saved && !selected ? (
            <button
              type="button"
              className="locate"
              onClick={() => {
                setMedium(saved.medium)
                setSelected({
                  name: saved.placeName,
                  longitude: saved.longitude,
                  latitude: saved.latitude,
                })
                setCard(saved)
                setWeather(saved.weatherLine)
              }}
            >
              Saved study
            </button>
          ) : null}
        </div>
      </header>

      {results.length > 0 ? (
        <ul className="results">
          {results.map((place) => (
            <li key={`${place.longitude}-${place.latitude}`}>
              <button type="button" onClick={() => void choose(place)}>
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {notice && !selected ? <p className="toast">{notice}</p> : null}

      <MapView spots={spots} selected={selected} onSelect={(location) => void choose(location)} />

      {selected ? (
        <FieldSheet
          location={selected}
          medium={medium}
          card={card}
          weatherLine={weather}
          notice={notice}
          busy={busy === 'card' || busy === 'voice' ? busy : null}
          onClose={() => {
            setSelected(null)
            setCard(null)
            setNotice(null)
          }}
          onWrite={() => void writeStudy()}
          onListen={() => void listen()}
        />
      ) : (
        <p className="hint">Tap a pigment dot, search a place, or stand where you will draw.</p>
      )}
    </div>
  )
}
