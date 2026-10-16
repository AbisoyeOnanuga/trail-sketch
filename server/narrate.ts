const MAX_SCRIPT = 600

/** Rewrite symbols the voice model reads badly into the words a person would say. */
export function speakable(script: string): string {
  return script
    .replace(/(-|−)\s?(\d+(?:\.\d+)?)\s?°\s?C\b/g, 'minus $2 degrees Celsius')
    .replace(/(\d+(?:\.\d+)?)\s?°\s?C\b/g, '$1 degrees Celsius')
    .replace(/(-|−)\s?(\d+(?:\.\d+)?)\s?°\s?F\b/g, 'minus $2 degrees Fahrenheit')
    .replace(/(\d+(?:\.\d+)?)\s?°\s?F\b/g, '$1 degrees Fahrenheit')
    .replace(/(\d+(?:\.\d+)?)\s?°/g, '$1 degrees')
    .replace(/(\d+)\s?km\/h\b/g, '$1 kilometers an hour')
    .replace(/\b1\s?km\b/g, '1 kilometer')
    .replace(/(\d+(?:\.\d+)?)\s?km\b/g, '$1 kilometers')
    .replace(/\b1\s?m\b/g, '1 meter')
    .replace(/(\d+(?:\.\d+)?)\s?m\b/g, '$1 meters')
    .replace(/\s*[·•|]\s*/g, '. ')
    .replace(/\s+[—–-]\s+/g, ', ')
    .replace(/\s*;\s*/g, '. ')
}

export async function narrate(script: string): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY?.trim()
  if (!key) throw new Error('missing_elevenlabs_key')
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM'
  if (!/^[A-Za-z0-9]{8,40}$/.test(voice)) throw new Error('voice_rejected')

  const text = speakable(script.replace(/\s+/g, ' ').trim()).slice(0, MAX_SCRIPT)
  if (!text) throw new Error('empty_script')

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: { stability: 0.45, similarity_boost: 0.7 },
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403 ? 'elevenlabs_rejected' : 'elevenlabs_failed')
  }
  return response.arrayBuffer()
}
