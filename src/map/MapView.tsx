import {
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
  type PointLike,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Location } from '../../shared/contract.ts'
import type { Spot } from '../data/spots.ts'
import { pinMarkup } from '../icons/pins.ts'

type MapPoint = { longitude: number; latitude: number }
type Kind = NonNullable<Spot['kind']>

export type MapInset = { top: number; bottom: number; left: number; right: number }

type MapViewProps = {
  spots: Spot[]
  camera: Location | null
  here: MapPoint | null
  inset: MapInset
  active: (Location & { kind: Kind | null }) | null
  hoverId: string | null
  onPin: (spot: Spot) => void
  onHover: (id: string | null) => void
  onGround: (location: Location) => void
}

const kindColors: Record<Kind, string> = {
  water: '#2f7f95',
  park: '#1f6b56',
  viewpoint: '#d4532b',
  architecture: '#5b4a3c',
  hill: '#7a7a3a',
}

const DOT_LAYERS = ['place-dots', 'place-clusters']
// Extra room above the bounds for the raised place flag.
const FIT_PADDING = { top: 72, bottom: 24, left: 40, right: 40 }

type PlaceCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: { id: string; kind: Kind; studied: number; name: string }
  }>
}

function collection(spots: Spot[]): PlaceCollection {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
      properties: { id: spot.id, kind: spot.kind ?? 'viewpoint', studied: spot.studied ? 1 : 0, name: spot.name },
    })),
  }
}

function addPlaceLayers(map: Map, spots: Spot[]) {
  if (map.getSource('places')) return
  map.addSource('places', {
    type: 'geojson',
    data: collection(spots),
    cluster: true,
    clusterRadius: 34,
    clusterMaxZoom: 14,
  })
  map.addLayer({
    id: 'place-clusters',
    type: 'circle',
    source: 'places',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#f4f2ec',
      'circle-radius': ['step', ['get', 'point_count'], 11, 6, 14, 12, 17],
      'circle-stroke-color': '#2c4a68',
      'circle-stroke-width': 1.5,
    },
  })
  map.addLayer({
    id: 'place-cluster-count',
    type: 'symbol',
    source: 'places',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 11,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#2c4a68' },
  })
  map.addLayer({
    id: 'place-hover',
    type: 'circle',
    source: 'places',
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-radius': 11,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': '#1c1914',
      'circle-stroke-width': 1.5,
    },
  })
  map.addLayer({
    id: 'place-dots',
    type: 'circle',
    source: 'places',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 6.5],
      'circle-color': [
        'match',
        ['get', 'kind'],
        'water', kindColors.water,
        'park', kindColors.park,
        'viewpoint', kindColors.viewpoint,
        'architecture', kindColors.architecture,
        'hill', kindColors.hill,
        '#2c4a68',
      ],
      'circle-stroke-color': ['case', ['==', ['get', 'studied'], 1], '#1f6b56', '#f4f2ec'],
      'circle-stroke-width': ['case', ['==', ['get', 'studied'], 1], 3, 1.5],
    },
  })
}

export function MapView({ spots, camera, here, inset, active, hoverId, onPin, onHover, onGround }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const insetRef = useRef(inset)
  const fitRef = useRef<[[number, number], [number, number]] | null>(null)
  const spotsRef = useRef(spots)
  const activeMarkerRef = useRef<Marker | null>(null)
  const hereMarkerRef = useRef<Marker | null>(null)
  const handlers = useRef({ onPin, onHover, onGround })

  useEffect(() => {
    handlers.current = { onPin, onHover, onGround }
  }, [onPin, onHover, onGround])

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
    map.on('load', () => addPlaceLayers(map, spotsRef.current))

    map.on('click', (event: MapMouseEvent) => {
      const slop = 10
      const box: [PointLike, PointLike] = [
        [event.point.x - slop, event.point.y - slop],
        [event.point.x + slop, event.point.y + slop],
      ]
      const layers = DOT_LAYERS.filter((id) => map.getLayer(id))
      const hits = layers.length ? map.queryRenderedFeatures(box, { layers }) : []
      const cluster = hits.find((feature) => feature.properties?.point_count)
      const dot = hits.find((feature) => !feature.properties?.point_count)
      if (dot) {
        const spot = spotsRef.current.find((item) => item.id === dot.properties?.id)
        if (spot) handlers.current.onPin(spot)
        return
      }
      if (cluster) {
        const source = map.getSource('places') as GeoJSONSource | undefined
        const coordinates = (cluster.geometry as { coordinates: [number, number] }).coordinates
        void source?.getClusterExpansionZoom(Number(cluster.properties?.cluster_id)).then((zoom) => {
          map.easeTo({ center: coordinates, zoom: zoom + 0.3 })
        })
        return
      }
      handlers.current.onGround({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        name: 'This spot',
      })
    })

    map.on('mousemove', 'place-dots', (event) => {
      map.getCanvas().style.cursor = 'pointer'
      handlers.current.onHover(String(event.features?.[0]?.properties?.id ?? '') || null)
    })
    map.on('mouseleave', 'place-dots', () => {
      map.getCanvas().style.cursor = ''
      handlers.current.onHover(null)
    })
    map.on('mouseenter', 'place-clusters', () => {
      map.getCanvas().style.cursor = 'zoom-in'
    })
    map.on('mouseleave', 'place-clusters', () => {
      map.getCanvas().style.cursor = ''
    })

    mapRef.current = map
    const resize = () => map.resize()
    map.on('load', resize)
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    requestAnimationFrame(resize)

    return () => {
      observer.disconnect()
      activeMarkerRef.current?.remove()
      hereMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    spotsRef.current = spots
    const source = mapRef.current?.getSource('places') as GeoJSONSource | undefined
    source?.setData(collection(spots))
  }, [spots])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (map.getLayer('place-hover')) map.setFilter('place-hover', ['==', ['get', 'id'], hoverId ?? ''])
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [hoverId])

  const activeLongitude = active?.longitude
  const activeLatitude = active?.latitude
  const activeName = active?.name
  const activeKind = active?.kind ?? null

  useEffect(() => {
    const map = mapRef.current
    activeMarkerRef.current?.remove()
    activeMarkerRef.current = null
    if (!map || activeLongitude === undefined || activeLatitude === undefined) return
    const flag = document.createElement('div')
    flag.className = 'place-flag'
    flag.setAttribute('aria-hidden', 'true')
    const art = document.createElement('span')
    art.className = 'place-flag-art'
    art.innerHTML = pinMarkup[activeKind ?? 'viewpoint']
    const label = document.createElement('span')
    label.className = 'place-flag-name'
    label.textContent = activeName ?? ''
    flag.append(art, label)
    activeMarkerRef.current = new Marker({ element: flag, anchor: 'bottom', offset: [0, -8] })
      .setLngLat([activeLongitude, activeLatitude])
      .addTo(map)
  }, [activeLongitude, activeLatitude, activeName, activeKind])

  const { top: insetTop, bottom: insetBottom, left: insetLeft, right: insetRight } = inset

  useEffect(() => {
    const padding = { top: insetTop, bottom: insetBottom, left: insetLeft, right: insetRight }
    insetRef.current = padding
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (!fitRef.current) {
        map.easeTo({ padding: insetRef.current, duration: 260 })
        return
      }
      map.setPadding(insetRef.current)
      map.fitBounds(fitRef.current, { padding: FIT_PADDING, maxZoom: 15, duration: 300 })
    }
    if (map.isMoving()) map.once('moveend', apply)
    else apply()
  }, [insetTop, insetBottom, insetLeft, insetRight])

  const cameraLongitude = camera?.longitude
  const cameraLatitude = camera?.latitude
  const hereLongitude = here?.longitude
  const hereLatitude = here?.latitude

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (hereLongitude === undefined || hereLatitude === undefined) {
      hereMarkerRef.current?.remove()
      hereMarkerRef.current = null
      return
    }
    const dot = document.createElement('div')
    dot.className = 'here-pin'
    dot.title = 'You are here'
    dot.setAttribute('role', 'img')
    dot.setAttribute('aria-label', 'You are here')
    const label = document.createElement('span')
    label.className = 'here-label'
    label.textContent = 'You are here'
    dot.append(label)
    hereMarkerRef.current?.remove()
    hereMarkerRef.current = new Marker({ element: dot }).setLngLat([hereLongitude, hereLatitude]).addTo(map)
  }, [hereLongitude, hereLatitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map || cameraLongitude === undefined || cameraLatitude === undefined) return
    const hasHere = hereLongitude !== undefined && hereLatitude !== undefined
    const apart =
      hasHere &&
      (Math.abs(cameraLongitude - hereLongitude) > 0.0008 || Math.abs(cameraLatitude - hereLatitude) > 0.0008)
    if (apart) {
      const west = Math.min(cameraLongitude, hereLongitude)
      const east = Math.max(cameraLongitude, hereLongitude)
      const south = Math.min(cameraLatitude, hereLatitude)
      const north = Math.max(cameraLatitude, hereLatitude)
      const span = Math.max(east - west, north - south)
      if (span < 0.45) {
        fitRef.current = [
          [west, south],
          [east, north],
        ]
        map.setPadding(insetRef.current)
        map.fitBounds(fitRef.current, { padding: FIT_PADDING, maxZoom: 15, essential: true })
        return
      }
    }
    fitRef.current = null
    map.flyTo({
      center: [cameraLongitude, cameraLatitude],
      zoom: Math.max(map.getZoom(), 13),
      padding: insetRef.current,
      essential: true,
    })
  }, [cameraLongitude, cameraLatitude, hereLongitude, hereLatitude])

  return <div ref={containerRef} className="map" />
}
