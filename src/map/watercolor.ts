import type { Map } from 'maplibre-gl'

// Restyles the OpenFreeMap "liberty" layers as a watercolor field map. The background layer is cleared so the
// paper texture on `.map` shows through every wash; fills stay partly transparent for the same reason.

const ink = '#3b352c'
const halo = 'rgba(244, 242, 236, 0.92)'
const paper = '#f4f2ec'

const fills: Record<string, [string, number]> = {
  water: ['#9cc3cf', 0.78],
  park: ['#bad19e', 0.68],
  landcover_wood: ['#a9c690', 0.58],
  landcover_grass: ['#c8dbb0', 0.58],
  landcover_wetland: ['#c2d5c6', 0.5],
  landcover_sand: ['#eedfc0', 0.6],
  landcover_ice: ['#eef3f4', 0.7],
  landuse_cemetery: ['#d3dbc2', 0.55],
  landuse_pitch: ['#d3e0c0', 0.55],
  landuse_track: ['#e6d9c6', 0.5],
  landuse_hospital: ['#ebe1d3', 0.45],
  landuse_school: ['#ebe1d3', 0.45],
  landuse_residential: ['#ebe5d8', 0],
  aeroway_fill: ['#e7e1d4', 0.6],
  building: ['#e2d9c8', 0.75],
}

// Roads are graphite lines, light enough that the washes and the places to study lead.
const roadColors: Array<[RegExp, string, number]> = [
  [/motorway/, '#8e8574', 0.6],
  [/trunk_primary/, '#9a9181', 0.6],
  [/secondary_tertiary/, '#aca393', 0.65],
  [/path_pedestrian/, '#b3a892', 0.7],
  [/service_track/, '#d0c8b8', 0.7],
  [/rail/, '#aaa194', 0.55],
  [/minor|link|street/, '#c6bdad', 0.75],
]

const hidden = [
  'building-3d',
  'road_area_pattern',
  'road_one_way_arrow',
  'road_one_way_arrow_opposite',
  'poi_r20',
  'poi_r7',
  'poi_r1',
  'poi_transit',
  'highway-shield-non-us',
  'highway-shield-us-interstate',
  'road_shield_us',
]

type PaintArgs = Parameters<Map['setPaintProperty']>

function set(map: Map, id: string, property: PaintArgs[1], value: PaintArgs[2]) {
  try {
    map.setPaintProperty(id, property, value)
  } catch {
    // A future style version may drop or retype a layer; the rest of the paint still applies.
  }
}

export function paintWatercolor(map: Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const { id, type } = layer
    if (hidden.includes(id)) {
      map.setLayoutProperty(id, 'visibility', 'none')
      continue
    }
    if (type === 'background') {
      set(map, id, 'background-opacity', 0)
      continue
    }
    if (type === 'raster') {
      set(map, id, 'raster-saturation', -0.55)
      set(map, id, 'raster-opacity', 0.55)
      continue
    }
    if (type === 'fill' && fills[id]) {
      const [color, opacity] = fills[id]
      set(map, id, 'fill-color', color)
      set(map, id, 'fill-opacity', opacity)
      if (id === 'building') set(map, id, 'fill-outline-color', '#c9bda6')
      else set(map, id, 'fill-outline-color', color)
      continue
    }
    if (type === 'line') {
      if (id.startsWith('waterway')) {
        set(map, id, 'line-color', '#7eafbf')
      } else if (id === 'park_outline') {
        set(map, id, 'line-color', '#97b282')
        set(map, id, 'line-opacity', 0.55)
      } else if (id.startsWith('boundary')) {
        set(map, id, 'line-color', '#b39d82')
        set(map, id, 'line-opacity', 0.6)
      } else if (id.startsWith('aeroway')) {
        set(map, id, 'line-color', '#d6cfc0')
      } else if (id.includes('casing')) {
        set(map, id, 'line-color', paper)
      } else if (id.startsWith('road_') || id.startsWith('bridge_') || id.startsWith('tunnel_')) {
        const [, color, opacity] = roadColors.find(([pattern]) => pattern.test(id)) ?? [null, '#c6bdad', 0.75]
        set(map, id, 'line-color', color)
        set(map, id, 'line-opacity', id.startsWith('tunnel_') ? opacity * 0.6 : opacity)
      }
      continue
    }
    if (type === 'symbol') {
      const water = id.startsWith('water')
      set(map, id, 'text-color', water ? '#3d6d7e' : id.startsWith('highway-name') ? '#6b6357' : ink)
      set(map, id, 'text-halo-color', halo)
      set(map, id, 'text-halo-width', 1.4)
      set(map, id, 'icon-opacity', 0.7)
      if (water) {
        try {
          map.setLayoutProperty(id, 'text-font', ['Noto Sans Italic'])
        } catch {
          // Keeps the style's own font if this one is missing.
        }
      }
    }
  }
}
