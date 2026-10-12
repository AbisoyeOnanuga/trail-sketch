const clientId = () => process.env.GOOGLE_CLIENT_ID?.trim() ?? ''

function oneLine(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function googleClientId(): string | null {
  const id = clientId()
  if (!/^[\w.-]{10,200}$/.test(id)) return null
  return id
}

export async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; name: string; email: string }> {
  const audience = googleClientId()
  if (!audience) throw new Error('missing_google_client')
  if (idToken.length < 20 || idToken.length > 4096) throw new Error('invalid_google_token')
  const url = new URL('https://oauth2.googleapis.com/tokeninfo')
  url.searchParams.set('id_token', idToken)
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error('google_rejected')
  const payload = (await response.json()) as {
    aud?: string
    sub?: string
    name?: string
    email?: string
    email_verified?: string | boolean
  }
  const verified = payload.email_verified === true || payload.email_verified === 'true'
  if (!verified || payload.aud !== audience || !payload.sub) throw new Error('google_rejected')
  return {
    sub: oneLine(payload.sub, 64),
    name: oneLine(payload.name, 80),
    email: oneLine(payload.email, 120),
  }
}
