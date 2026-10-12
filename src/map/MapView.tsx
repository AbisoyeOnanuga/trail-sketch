import { Map, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Location } from '../../shared/contract.ts'
import type { Spot } from '../data/spots.ts'

type MapViewProps = {
  spots: Spot[]
  selected: Location | null
  onSelect: (location: Location) => void
}

export function MapView({ spots, selected, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

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
      onSelectRef.current({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        name: 'This spot',
      })
    })
    mapRef.current = map

    return () => {
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
      dot.className = 'pin'
      dot.title = spot.name
      dot.setAttribute('aria-label', spot.name)
      const active =
        selected !== null &&
        Math.abs(selected.longitude - spot.longitude) < 0.0001 &&
        Math.abs(selected.latitude - spot.latitude) < 0.0001
      if (active) dot.classList.add('is-active')
      dot.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectRef.current({
          longitude: spot.longitude,
          latitude: spot.latitude,
          name: spot.name,
        })
      })
      return new Marker({ element: dot }).setLngLat([spot.longitude, spot.latitude]).addTo(map)
    })
  }, [spots, selected])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selected) return
    map.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), 13),
      essential: true,
    })
  }, [selected])

  return <div ref={containerRef} className="map" />
}
