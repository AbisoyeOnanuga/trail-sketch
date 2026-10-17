# Trail Sketch

A phone-first map for plein-air drawing and painting. On a phone it asks what you look for, then shows painted previews of places within a short stay, a walk, or a hike. Tap a feel word, or describe the study, and the closest match comes forward. Open it for the drawing or painting notes. Gemma writes that study. ElevenLabs reads it aloud so the phone can go back in a pocket. The last live study stays on the device.

## Run locally

```bash
npm install
npm run dev
```

The map and search work without keys. Copy `.env.example` to `.env` in this folder when you are ready for a live study or a spoken reading. The server reads those values. They are not shipped to the browser.

| Name | Purpose |
| --- | --- |
| `GEMMA_API_KEY` | Google AI Studio key. The same key calls Gemma. `GEMINI_API_KEY` is read only if this name is empty. |
| `GEMMA_MODEL` | Defaults to `gemma-4-26b-a4b-it` |
| `GEMMA_BASE_URL` | Optional. Another endpoint for the study. A local Ollama example is `http://127.0.0.1:11434/v1`. |
| `GOOGLE_CLIENT_ID` | Optional Google sign-in so studied places stay with that account on the phone |
| `ELEVENLABS_API_KEY` | Turns the spoken reading on. Without it, Read aloud stays quiet. |
| `ELEVENLABS_VOICE_ID` | Optional, and only for a custom voice. Leave it empty and the reading uses a public ElevenLabs voice. |
| `SENTRY_DSN` | Optional. Sends server errors to Sentry. Leave it empty and nothing is reported. |

`GEMMA_BASE_URL` must be `https`, or `http` only on localhost. The server does not read a separate Ollama variable.

Every third-party service, library, and stored value is listed in [docs/SERVICES.md](docs/SERVICES.md).

## Deploy

`render.yaml` describes a Node web service. The build installs dev dependencies on purpose, because `NODE_ENV=production` would otherwise skip Vite and TypeScript. Set the key variables in the Render dashboard. Do not put secret values in the file.

A static site that publishes the repository root serves `index.html` before the build, so the browser asks for `/src/main.tsx` and the map never starts. Use the web service, with start command `npm start`.

```bash
npm run build
npm start
```
