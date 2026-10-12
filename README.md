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
| `GEMMA_MODEL` | Defaults to `gemma-3-12b-it` |
| `GEMMA_BASE_URL` | Optional. Use `http://127.0.0.1:11434/v1` for a local Ollama Gemma |
| `ELEVENLABS_API_KEY` | Narration |
| `ELEVENLABS_VOICE_ID` | Optional voice id |

`GEMMA_BASE_URL` must be `https`, or `http` only on localhost.

## Deploy

`render.yaml` describes a Node web service. Set the key variables in the Render dashboard. Do not put secret values in the file.

```bash
npm run build
npm start
```
