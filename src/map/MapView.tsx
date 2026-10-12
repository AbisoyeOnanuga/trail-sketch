import { Map, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Location } from '../../shared/contract.ts'
import type { Spot } from '../data/spots.ts'

type MapViewProps = {
  spots: Spot[]
  camera: Location | null
  onPin: (location: Location) => void
  onGround: (location: Location) => void
}

export function MapView({ spots, camera, onPin, onGround }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onPinRef = useRef(onPin)
  const onGroundRef = useRef(onGround)

  useEffect(() => {
    onPinRef.current = onPin
    onGroundRef.current = onGround
  }, [onPin, onGround])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    setWorkerUrl(workerUrl)
    const map = new Map({
      container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [10, 28],
      zoom: 1.5,
    })
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.on('click', (event: MapMouseEvent) => {
      onGroundRef.current({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        name: 'This spot',
      })
    })
    mapRef.current = map
    const resize = () => map.resize()
    map.on('load', resize)
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    requestAnimationFrame(resize)

    return () => {
      observer.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = spots.map((spot) => {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = `pin pin-${spot.kind ?? 'viewpoint'}${spot.studied ? ' is-studied' : ''}`
      dot.title = spot.studied ? `${spot.name}, studied` : spot.name
      dot.setAttribute('aria-label', dot.title)
      const active =
        camera !== null &&
        Math.abs(camera.longitude - spot.longitude) < 0.0001 &&
        Math.abs(camera.latitude - spot.latitude) < 0.0001
      if (active) dot.classList.add('is-active')
      dot.addEventListener('click', (event) => {
        event.stopPropagation()
        onPinRef.current({
          longitude: spot.longitude,
          latitude: spot.latitude,
          name: spot.name,
        })
      })
      return new Marker({ element: dot }).setLngLat([spot.longitude, spot.latitude]).addTo(map)
    })
  }, [spots, camera])

  const cameraLongitude = camera?.longitude
  const cameraLatitude = camera?.latitude

  useEffect(() => {
    const map = mapRef.current
    if (!map || cameraLongitude === undefined || cameraLatitude === undefined) return
    map.flyTo({
      center: [cameraLongitude, cameraLatitude],
      zoom: Math.max(map.getZoom(), 13),
      essential: true,
    })
  }, [cameraLongitude, cameraLatitude])

  return <div ref={containerRef} className="map" />
}
