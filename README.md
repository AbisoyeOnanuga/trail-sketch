# Trail Sketch

A phone-first map for plein-air drawing and painting. Pick graphite, ink, watercolor, or oil, stand at a place, and write a field study. Gemma writes the study. ElevenLabs reads it aloud so the phone can go back in a pocket. The last live study stays on the device.

## Run locally

```bash
npm install
npm run dev
```

The map and search work without keys. Copy `.env.example` to `.env` in this folder when you are ready for a live study or a spoken reading. The server reads those values. They are not shipped to the browser.

| Name | Purpose |
| --- | --- |
| `GEMMA_API_KEY` | Google AI Studio key for Gemma |
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
