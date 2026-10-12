import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  errorCopy,
  loadNearby,
  loadPlace,
  readCachedCard,
  requestFieldCard,
  requestNarration,
  searchPlaces,
  writeCachedCard,
} from './api.ts'
import { spots, type Spot } from './data/spots.ts'
import { Explorer, StudyArt } from './explore/Explorer.tsx'
import { isStudied, noteVisitWeather, readProfile, readVisits, rememberVisit, type GoogleProfile, type Visit } from './library.ts'
import { LibrarySheet } from './library/LibrarySheet.tsx'
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
import {
  CASUAL_REACH_METERS,
  distanceChoices,
  distanceMeters,
  formatDistance,
  portraitFor,
  rankStudies,
  reachLabel,
  type DistanceId,
  type FeelWord,
  type InterestId,
  type Study,
  type StudyKind,
} from '../shared/studies.ts'

const INTERESTS_KEY = 'trail-sketch.interests'

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

function readInterests(): InterestId[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTERESTS_KEY) ?? 'null') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is InterestId =>
      item === 'water' || item === 'trees' || item === 'buildings' || item === 'sky' || item === 'streets' || item === 'hills',
    )
  } catch {
    return []
  }
}

function kindFromHint(hint: string): StudyKind {
  const text = hint.toLowerCase()
  if (/pond|water|skyline|river|beach|shore|lake/.test(text)) return 'water'
  if (/terrace|arcade|observatory|bridge|street|arch/.test(text)) return 'architecture'
  if (/hill|ridge|peak|cliff/.test(text)) return 'hill'
  if (/view|overlook|light|sky/.test(text)) return 'viewpoint'
  return 'park'
}

const travelStudies: Study[] = spots.map((spot) => {
  const kind = kindFromHint(spot.hint)
  const portrait = portraitFor(kind)
  return {
    id: spot.id,
    name: spot.name,
    longitude: spot.longitude,
    latitude: spot.latitude,
    distanceMeters: 0,
    kind,
    feel: portrait.feel,
    line: spot.hint,
  }
})

function samePlace(study: Study, location: Location): boolean {
  return Math.abs(study.longitude - location.longitude) < 0.0001 && Math.abs(study.latitude - location.latitude) < 0.0001
}

function toSpot(study: Study, studied: boolean): Spot {
  return {
    id: study.id,
    name: study.name,
    longitude: study.longitude,
    latitude: study.latitude,
    hint: study.line,
    kind: study.kind,
    studied,
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
  const [interests, setInterests] = useState<InterestId[]>(() => readInterests())
  const [editing, setEditing] = useState(false)
  const [distance, setDistance] = useState<DistanceId>('walk')
  const [feel, setFeel] = useState<FeelWord | null>(null)
  const [prompt, setPrompt] = useState('')
  const [area, setArea] = useState<{ latitude: number; longitude: number } | null>(null)
  const [studies, setStudies] = useState<Study[]>([])
  const [areaBusy, setAreaBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const [profile, setProfile] = useState<GoogleProfile | null>(() => readProfile())
  const [visits, setVisits] = useState<Visit[]>(() => readVisits(readProfile()?.sub ?? null))
  const [libraryOpen, setLibraryOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrl = useRef<string | null>(null)
  const chooseId = useRef(0)

  useEffect(() => {
    return () => {
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current)
    }
  }, [])

  const areaRequest = useRef(0)

  useEffect(() => {
    if (!area) return
    const request = areaRequest.current + 1
    areaRequest.current = request
    const meters = distanceChoices.find((choice) => choice.id === distance)?.meters ?? 4000
    loadNearby(area.latitude, area.longitude, meters)
      .then((next) => {
        if (areaRequest.current !== request) return
        setStudies(next)
      })
      .catch((error: unknown) => {
        if (areaRequest.current !== request) return
        const code = error instanceof Error ? error.message : 'request_failed'
        setStudies([])
        setNotice(errorCopy[code] ?? errorCopy.request_failed)
      })
      .finally(() => {
        if (areaRequest.current === request) setAreaBusy(false)
      })
  }, [area, distance])

  const pool = useMemo(() => {
    if (studies.length > 0) return studies
    if (area) return []
    return travelStudies
  }, [studies, area])

  const ranked = useMemo(
    () => rankStudies(pool, { feel, description: prompt, interests }),
    [pool, feel, prompt, interests],
  )
  const rankingKey = `${feel ?? ''}|${prompt}|${ranked.map((study) => study.id).join(',')}`
  const [pick, setPick] = useState<{ key: string; id: string | null }>({ key: '', id: null })
  if (pick.key !== rankingKey) {
    setPick({ key: rankingKey, id: ranked[0]?.id ?? null })
  }
  const activeId = pick.id

  const focused = ranked.find((study) => study.id === activeId) ?? ranked[0] ?? null
  const camera = useMemo<Location | null>(() => {
    if (selected) return selected
    if (focused && (area || touched)) {
      return { name: focused.name, longitude: focused.longitude, latitude: focused.latitude }
    }
    if (area) return { name: 'Here', longitude: area.longitude, latitude: area.latitude }
    return null
  }, [selected, focused, area, touched])

  const mapSpots = (area ? studies : travelStudies).map((study) =>
    toSpot(study, isStudied(visits, study.latitude, study.longitude)),
  )

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
      setVisits(noteVisitWeather(profile?.sub ?? null, location.latitude, location.longitude, place.weatherLine))
    } catch (error) {
      if (chooseId.current !== id) return
      const code = error instanceof Error ? error.message : 'request_failed'
      setNotice(errorCopy[code] ?? errorCopy.request_failed)
    }
  }, [profile])

  const acceptFix = useCallback((latitude: number, longitude: number) => {
    setAreaBusy(true)
    setStudies([])
    setNotice(null)
    setSelected(null)
    setCard(null)
    setArea({ latitude, longitude })
  }, [])

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice('This browser cannot share a location.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => acceptFix(position.coords.latitude, position.coords.longitude),
      () => setNotice('Location stayed off. Search a place or pick a trip.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }, [acceptFix])

  useEffect(() => {
    if (interests.length === 0 || area || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => acceptFix(position.coords.latitude, position.coords.longitude),
      () => setNotice('Location stayed off. Search a place or pick a trip.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }, [interests.length, area, acceptFix])

  function saveInterests(next: InterestId[]) {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(next))
    setInterests(next)
    setEditing(false)
  }

  const searchTimer = useRef(0)

  function lookNearby(value: string) {
    window.clearTimeout(searchTimer.current)
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    searchTimer.current = window.setTimeout(() => {
      void searchPlaces(trimmed)
        .then((found) => {
          const first = found[0]
          if (area && first) {
            const meters = distanceMeters(area.latitude, area.longitude, first.latitude, first.longitude)
            if (meters > CASUAL_REACH_METERS) {
              const nearest = ranked[0]
              setResults([])
              setNotice(
                nearest
                  ? `${first.name} is farther than a walk or a short ride. The nearest place to study is ${nearest.name}.`
                  : `${first.name} is farther than a walk or a short ride.`,
              )
              if (nearest) {
                setTouched(true)
                setPick((current) => ({ ...current, id: nearest.id }))
              }
              return
            }
          }
          setResults(found.slice(0, 3))
        })
        .catch((error: unknown) => {
          const code = error instanceof Error ? error.message : 'request_failed'
          setNotice(errorCopy[code] ?? errorCopy.request_failed)
          setResults([])
        })
    }, 400)
  }

  function onSearch(event: FormEvent) {
    event.preventDefault()
    lookNearby(query)
  }

  function focusSearch(place: Location) {
    setResults([])
    setQuery('')
    if (area) {
      const meters = distanceMeters(area.latitude, area.longitude, place.latitude, place.longitude)
      if (meters > CASUAL_REACH_METERS) {
        const nearest = ranked[0]
        setNotice(
          nearest
            ? `${place.name} is farther than a walk or a short ride. The nearest place to study is ${nearest.name}.`
            : `${place.name} is farther than a walk or a short ride.`,
        )
        if (nearest) {
          setTouched(true)
          setPick((current) => ({ ...current, id: nearest.id }))
        }
        return
      }
    }
    acceptFix(place.latitude, place.longitude)
  }

  function acceptStudy(study: Study) {
    setVisits(
      rememberVisit(
        {
          id: study.id,
          name: study.name,
          latitude: study.latitude,
          longitude: study.longitude,
          kind: study.kind,
          studiedAt: new Date().toISOString(),
          medium,
          weatherLine: weather,
        },
        profile?.sub ?? null,
      ),
    )
    void choose({ name: study.name, longitude: study.longitude, latitude: study.latitude })
  }

  const signIn = useCallback((next: GoogleProfile | null) => {
    if (next) {
      for (const visit of readVisits(null)) rememberVisit(visit, next.sub)
      setProfile(next)
      setVisits(readVisits(next.sub))
      return
    }
    setProfile(null)
    setVisits(readVisits(null))
  }, [])

  function changeDistance(next: DistanceId) {
    if (area) {
      setAreaBusy(true)
      setStudies([])
      setNotice(null)
    }
    setDistance(next)
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

  function onPin(location: Location) {
    const match = ranked.find((study) => samePlace(study, location))
    if (match) {
      setTouched(true)
      setPick({ key: rankingKey, id: match.id })
      return
    }
    void choose(location)
  }

  const promptActive = feel !== null || prompt.length > 0
  const showExplorer = selected === null && !libraryOpen
  const showStudy = selected !== null && !libraryOpen
  const typed = query.trim().toLowerCase()
  const visualMatches =
    typed.length < 2
      ? []
      : ranked
          .filter((study) => `${study.name} ${study.kind} ${study.feel} ${study.line}`.toLowerCase().includes(typed))
          .slice(0, 4)

  return (
    <div className={showExplorer ? 'app has-explorer' : 'app'}>
      <header className="bar">
        <div className="brand">
          <p className="mark">Trail Sketch</p>
          <p className="tag">A field study for drawing and painting</p>
        </div>
        <form className="search" onSubmit={onSearch}>
          <label className="sr" htmlFor="place-search">
            Look nearby by subject
          </label>
          <input
            id="place-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              lookNearby(event.target.value)
            }}
            placeholder="Subject or mood nearby"
            autoComplete="off"
          />
          <button type="submit">Look</button>
        </form>
        <p className="field-label" id="medium-label">
          Select your medium
        </p>
        <div className="mediums" role="radiogroup" aria-labelledby="medium-label">
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
            Find places near me
          </button>
          <button type="button" className="locate" onClick={() => setLibraryOpen(true)}>
            Studied{visits.length > 0 ? ` · ${visits.length}` : ''}
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

      {visualMatches.length > 0 || results.length > 0 ? (
        <div className="suggest" role="listbox" aria-label="Nearby matches">
          {visualMatches.map((study) => (
            <button
              key={study.id}
              type="button"
              className="suggest-row"
              onClick={() => {
                setTouched(true)
                setPick((current) => ({ ...current, id: study.id }))
                setQuery('')
                setResults([])
              }}
            >
              <StudyArt kind={study.kind} />
              <span>
                <strong>{study.name}</strong>
                <small>
                  {area ? `${reachLabel(study.distanceMeters)} · ${formatDistance(study.distanceMeters)}` : 'A trip'}
                </small>
              </span>
            </button>
          ))}
          {results.map((place) => (
            <button
              key={`${place.longitude}-${place.latitude}`}
              type="button"
              className="suggest-row"
              onClick={() => focusSearch(place)}
            >
              <span>
                <strong>{place.name}</strong>
                <small>
                  {area
                    ? reachLabel(distanceMeters(area.latitude, area.longitude, place.latitude, place.longitude))
                    : 'Move the map here'}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <MapView spots={mapSpots} camera={camera} onPin={onPin} onGround={(location) => void choose(location)} />

      {showStudy ? (
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
        <Explorer
          interests={interests}
          editing={editing}
          onSaveInterests={saveInterests}
          onEditInterests={() => setEditing(true)}
          distance={distance}
          onDistance={changeDistance}
          feel={feel}
          onFeel={setFeel}
          onPrompt={setPrompt}
          studies={ranked}
          focusedId={focused?.id ?? null}
          bestId={ranked[0]?.id ?? null}
          promptActive={promptActive}
          loading={areaBusy}
          hasArea={area !== null}
          notice={notice}
          onFocus={(study) => {
            setTouched(true)
            setPick({ key: rankingKey, id: study.id })
          }}
          onOpen={acceptStudy}
        />
      )}
      {libraryOpen ? (
        <LibrarySheet
          visits={visits}
          profile={profile}
          onProfile={signIn}
          onClose={() => setLibraryOpen(false)}
          onOpen={(visit) => {
            setLibraryOpen(false)
            setMedium(visit.medium)
            void choose({ name: visit.name, longitude: visit.longitude, latitude: visit.latitude })
          }}
        />
      ) : null}
    </div>
  )
}
