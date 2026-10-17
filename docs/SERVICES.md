# Services and resources

Everything Trail Sketch depends on, in one place. Checked against the code on October 17, 2026.

Status words used below:

- **Active**: called by the running app today.
- **Fallback**: only used when the main service fails or is slow.
- **Optional**: works when its key is set; the app runs without it.
- **Built, not switched on**: the code is there, but the setting it needs is empty locally and on Render.

## At a glance

| Service | What it does in the app | Key needed | Status |
| --- | --- | --- | --- |
| Render | Hosts the web service | Render account | Active |
| GitHub | Source repository | GitHub account | Active |
| Google AI Studio (Gemma) | Writes the study plan | `GEMMA_API_KEY` | Optional |
| ElevenLabs | Reads the plan aloud | `ELEVENLABS_API_KEY` | Optional |
| OpenFreeMap | Map tiles and map style | No | Active |
| Photon (Komoot) | Place search, place names, nearby places | No | Active |
| Nominatim (OpenStreetMap) | Place search and names | No | Fallback |
| Overpass API | Nearby places | No | Fallback |
| Open-Meteo | Current weather and light | No | Active |
| Wikipedia API | Place photos | No | Active |
| Google Fonts | Fraunces, Literata, IBM Plex Mono | No | Active |
| Google Maps (link only) | Walking directions | No | Active |
| Google Identity Services | Sign in to keep places with an account | `GOOGLE_CLIENT_ID` | Built, not switched on |

The map, search, nearby places, weather, and photos all work with no keys at all.

## Hosting

**Render** runs one Node web service, described in `render.yaml`.

- Build: `npm install --include=dev && npm run build`. Dev dependencies are installed on purpose, because `NODE_ENV=production` would otherwise skip Vite and TypeScript.
- Start: `npm start`, which runs the Hono server with `tsx`.
- The same server answers `/api/*` and serves the built app from `dist/`. Files under `/assets/` are cached for a year. The page itself is never cached, so a new deploy shows up on the next load.
- Live site: <https://trail-sketch.onrender.com>.

**GitHub** holds the code: <https://github.com/AbisoyeOnanuga/trail-sketch>.

## AI

### Gemma, through Google AI Studio

Writes the field study: tone notes, palette, subject, a line about the light, and the script that gets read aloud.

- Code: `server/gemma.ts`. Route: `POST /api/field-card`.
- Model: `gemma-4-26b-a4b-it` by default (`GEMMA_MODEL`).
- Endpoint: Google's OpenAI-compatible endpoint, `https://generativelanguage.googleapis.com/v1beta/openai`. `GEMMA_BASE_URL` can point somewhere else, such as a local Ollama at `http://127.0.0.1:11434/v1`. That URL must be `https`, or `http` only on localhost.
- Key: `GEMMA_API_KEY`. If it is empty, `GEMINI_API_KEY` is used instead.
- Behaviour: asks for JSON, at temperature 0.2. It waits up to 45 seconds and retries once on a server error.
- Without a key, or when Gemma fails: the app writes its own plan in the browser (`src/plan/fallback.ts`). That plan uses the type of place, the light, the time of day, the medium, and the pigments.

### ElevenLabs

Reads the plan aloud through **Hear this plan**.

- Code: `server/narrate.ts`. Route: `POST /api/narrate`.
- Model: `eleven_flash_v2_5`. Voice: `ELEVENLABS_VOICE_ID`, or a public default voice (`21m00Tcm4TlvDq8ikWAM`).
- Before sending, the text is rewritten so it reads well aloud. Degrees become "degrees Celsius", units are spelled out, and symbols such as `·` and `|` become pauses. The text is capped at 600 characters.
- Waits up to 25 seconds. The audio is not cached.

## Maps and places

### MapLibre GL (library) and OpenFreeMap (tiles)

- MapLibre draws the map in the browser (`src/map/MapView.tsx`). It needs a web worker to draw streets and labels. If the map ever shows only a plain background while the list still works, open a fresh tab.
- The map style is OpenFreeMap "liberty", which uses OpenStreetMap data: `https://tiles.openfreemap.org/styles/liberty`. It is free and needs no key.
- The OpenStreetMap credit in the map corner is required. Keep it.

### Photon, by Komoot

The main place service. Free, no key, run as a fair-use public service.

- **Search as you type**: `/api/`, weighted toward where you are (`server/places.ts`).
- **Place names** for a tapped spot: `/reverse`, with a 2.5 second timeout.
- **Nearby places**: `/reverse` with OpenStreetMap tags, sent as two grouped requests (`server/nearby.ts`). One request covers nature, places of worship, historic sites, squares, and towers; the other covers viewpoints. Photon answers one request at a time per caller, so fewer, wider requests are faster than many small ones.

### Nominatim, by OpenStreetMap (fallback)

Used for search and place names when Photon fails. The public server allows about one request per second and requires an identifying `User-Agent`. The app sends `TrailSketch/0.1 (plein-air field guide)`.

### Overpass API (fallback)

Used for nearby places only if Photon returns nothing. Two public servers race each other, `overpass-api.de` and `overpass.kumi.systems`, with a 6 second limit. Both are often slow or busy, which is why Photon is the main source.

## Weather

**Open-Meteo**, `https://api.open-meteo.com/v1/forecast`. Free, no key, for non-commercial use.

- Reads current temperature, cloud cover, wind, and the weather code, and turns them into one line such as "10°C, overcast, flat light, a working breeze".
- Used when a place opens and when a plan is written.
- Results are kept for 15 minutes, for up to 200 locations, on the server.

## Photos

**Wikipedia API**, `https://en.wikipedia.org/w/api.php`, called straight from the browser (`src/photos.ts`).

- Searches the place name and takes the first page's thumbnail (480 px). The image itself comes from Wikimedia.
- When there is no photo, the card shows painted scene art with contour lines (`StudyArt` in `src/explore/Explorer.tsx`).

## Sign-in (built, not switched on)

**Google Identity Services** shows the Google sign-in button in the library sheet (`src/library/LibrarySheet.tsx`), loading `https://accounts.google.com/gsi/client`.

- The server checks the sign-in token with `https://oauth2.googleapis.com/tokeninfo` (`server/google.ts`, `POST /api/auth/google`).
- Signing in only changes which list of places is used on this phone. Places are still stored on the device; there is no server database.
- To switch it on, create a Web client ID in Google Cloud, add the site's address as an authorized origin, and set `GOOGLE_CLIENT_ID` in `.env` and on Render. On October 17 it was empty in both places, so the sign-in button does not appear.

## Links out

**Google Maps directions**: **Walking directions** opens a `google.com/maps/dir/` link with walking mode. There is no API call and no key.

## Fonts, icons, and design credits

- **Google Fonts** (loaded in `index.html`): Fraunces for headings, Literata for body text, IBM Plex Mono for labels.
- **Lucide** stroke icons, ISC license (`src/icons/glyphs.tsx`).
- **Uiverse Galaxy** spinners, MIT license, used for loaders only (credited in `src/index.css`).
- Map pins and scene art are hand-made SVGs in `src/icons/pins.ts` and `src/explore/Explorer.tsx`.

## Libraries in the app

| Library | Use |
| --- | --- |
| React 19 | Interface |
| MapLibre GL 6 | Map |
| Lenis | Smooth scrolling, only inside the place list, field sheet, and library sheet |
| Zod | Checks request bodies and saved data |
| Hono and `@hono/node-server` | API server and static files |
| tsx | Runs the TypeScript server directly |

## Build and dev tools

| Tool | Use |
| --- | --- |
| Vite 8 (Rolldown) | Dev server and production build. MapLibre and React are split into their own files. |
| TypeScript 6 | Type checking (`npm run build` runs `tsc -b` first) |
| React Compiler (Babel plugin) | Automatic memoization |
| ESLint | `npm run lint` |
| concurrently | `npm run dev` starts the API and the web server together |

## What is stored, and where

Nothing is stored in a database. On the phone, in `localStorage`:

| Key | Holds |
| --- | --- |
| `trail-sketch.interests` | What you chose to study (water, trees, and so on) |
| `trail-sketch.visits.device` | Places opened ("visited") and places with a plan ("studied"), up to 80 |
| `trail-sketch.visits.<google id>` | The same list for a signed-in account |
| `trail-sketch.google-profile` | Name and email after sign-in |
| `trail-sketch.last-card` | The last plan, so it still shows offline |

On the server, in memory only (cleared on every restart or deploy):

- Nearby results for 30 minutes, and weather for 15 minutes, filed under the position they were asked for. Nothing is written to disk, and one visitor's location is never sent to another.
- Rate limits per visitor, per minute unless noted: search 40, place 30, nearby 10, sign-in 10. Plans are limited to 12 and readings to 8, per 10 minutes.

## Settings (environment variables)

Server only. They are never sent to the browser. Real values go in `.env` locally and in the Render dashboard, never in the repository.

| Name | Needed for | Default |
| --- | --- | --- |
| `GEMMA_API_KEY` | Plans from Gemma | none |
| `GEMINI_API_KEY` | Used only if `GEMMA_API_KEY` is empty | none |
| `GEMMA_MODEL` | Model name | `gemma-4-26b-a4b-it` |
| `GEMMA_BASE_URL` | Another endpoint, such as Ollama | Google's endpoint |
| `ELEVENLABS_API_KEY` | Readings | none |
| `ELEVENLABS_VOICE_ID` | Voice choice | public default voice |
| `GOOGLE_CLIENT_ID` | Sign-in | none (sign-in hidden) |
| `PORT` | Server port | `8787` |
| `NODE_ENV=production` or `SERVE_STATIC=1` | Serve the built app from `dist/` | off in dev |

## Deliberately not used

- **SerpAPI**, or any paid search: places come from free OpenStreetMap services.
- **A database or shared location**: each phone keeps its own places.

## Leftovers worth tidying

- The `spots` list of Toronto places in `src/data/spots.ts` is no longer shown. Only the `Spot` type in that file is still used.
- `public/icons.svg` is not referenced anywhere.
- `.entire/` holds settings for the Entire session-checkpoint tool (telemetry off). It is a dev tool, not part of the app.
