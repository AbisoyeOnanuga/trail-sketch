const cache = new Map<string, string | null>()

export async function placePhoto(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase()
  if (key.length < 4 || key.startsWith('a ')) return null
  if (cache.has(key)) return cache.get(key) ?? null
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrsearch', name)
  url.searchParams.set('gsrlimit', '1')
  url.searchParams.set('prop', 'pageimages')
  url.searchParams.set('piprop', 'thumbnail')
  url.searchParams.set('pithumbsize', '480')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  try {
    const response = await fetch(url)
    if (!response.ok) {
      cache.set(key, null)
      return null
    }
    const body = (await response.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> }
    }
    const page = Object.values(body.query?.pages ?? {})[0]
    const source = page?.thumbnail?.source ?? null
    cache.set(key, source)
    return source
  } catch {
    cache.set(key, null)
    return null
  }
}
