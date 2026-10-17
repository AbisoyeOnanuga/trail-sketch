# Trail Sketch

A phone-first map for plein-air drawing and painting. On a phone it asks what you look for, then shows painted previews of places within a short stay, a walk, or a hike. Tap a feel word, or describe the study, and the closest match comes forward. Open it for the drawing or painting notes. Gemma writes that study. ElevenLabs reads it aloud so the phone can go back in a pocket. The last live study stays on the device.

## Commits after the Week 1 deadline

Trail Sketch was entered in the [Hacktoberfest Open-Source AI Challenge: Week 1](https://dev.to/challenges/hacktoberfest-week1-2026-10-05) (Touch Grass). Submissions were due October 11, 2026 at 11:59 PM PDT, which is October 12, 2026 at 6:59 AM UTC.

A working version was already on `main` before that deadline: `45fe0b0` (October 12, 2026 at 2:55 AM EDT).

DEV challenge rules say commits made after the submission deadline must be noted in the project README. The commits below are that note. They keep the same app visible and working, including for a resume. They are not a new entry.

- Just after the deadline, and through the morning of October 12: the public deploy, screenshots, the phone layout, and a visual pass on the cards, navigation, and icons (`c02abc2`, `f268e56`, `5fb9303`, `b36b3d8`, `96e7da1`, `bb838e3`, `97c1ff7`, `042d5ec`).
- October 14: `79875ea` removes a broken CSS rule the visual pass left behind. The production build failed on that rule, so this commit is what lets the visual version build.

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
| `GEMMA_BASE_URL` | Optional. Use `http://127.0.0.1:11434/v1` for a local Ollama Gemma |
| `GOOGLE_CLIENT_ID` | Optional Google sign-in so studied places stay with that account on the phone |
| `ELEVENLABS_API_KEY` | Narration |
| `ELEVENLABS_VOICE_ID` | Optional voice id |

`GEMMA_BASE_URL` must be `https`, or `http` only on localhost.

Every outside service, library, and stored value is listed in [docs/SERVICES.md](docs/SERVICES.md).

## Deploy

`render.yaml` describes a Node web service. The build installs dev dependencies on purpose, because `NODE_ENV=production` would otherwise skip Vite and TypeScript. Set the key variables in the Render dashboard. Do not put secret values in the file.

A static site that publishes the repository root serves `index.html` before the build, so the browser asks for `/src/main.tsx` and the map never starts. Use the web service, with start command `npm start`.

```bash
npm run build
npm start
```
