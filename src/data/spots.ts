export type Spot = {
  id: string
  name: string
  longitude: number
  latitude: number
  hint: string
}

export const spots: Spot[] = [
  {
    id: 'high-park',
    name: 'High Park',
    longitude: -79.4637,
    latitude: 43.6465,
    hint: 'Grenadier Pond, willows, and a long west light',
  },
  {
    id: 'toronto-islands',
    name: 'Toronto Islands',
    longitude: -79.3789,
    latitude: 43.6205,
    hint: 'Skyline across water, wind on the page',
  },
  {
    id: 'central-park',
    name: 'Bethesda Terrace',
    longitude: -73.9712,
    latitude: 40.776,
    hint: 'Arcade shadow against the lake',
  },
  {
    id: 'griffith',
    name: 'Griffith Observatory',
    longitude: -118.3004,
    latitude: 34.1184,
    hint: 'Basin haze and a hard horizon',
  },
  {
    id: 'baker-beach',
    name: 'Baker Beach',
    longitude: -122.4836,
    latitude: 37.7935,
    hint: 'Bridge, surf, and a cool north light',
  },
  {
    id: 'stanley-park',
    name: 'Stanley Park seawall',
    longitude: -123.136,
    latitude: 49.3017,
    hint: 'Cedars, tide line, and wet stone',
  },
  {
    id: 'montmartre',
    name: 'Montmartre',
    longitude: 2.3431,
    latitude: 48.8867,
    hint: 'Steps, zinc roofs, and late plaster light',
  },
  {
    id: 'seine',
    name: 'Pont Neuf',
    longitude: 2.3414,
    latitude: 48.857,
    hint: 'River planes and a stone silhouette',
  },
]
