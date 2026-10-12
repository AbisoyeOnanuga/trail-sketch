import { readFileSync } from 'node:fs'

const allowed = new Set([
  'GEMMA_API_KEY',
  'GEMINI_API_KEY',
  'GEMMA_MODEL',
  'GEMMA_BASE_URL',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
  'PORT',
])

export function loadEnvFile(): void {
  let raw: string
  try {
    raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  } catch {
    return
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    if (!allowed.has(key) || process.env[key]) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
  if (!process.env.GEMMA_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GEMMA_API_KEY = process.env.GEMINI_API_KEY
  }
}
