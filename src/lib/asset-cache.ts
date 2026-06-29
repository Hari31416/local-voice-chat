const CACHE_NAME = 'voice-agent-assets-v1'
const MAX_CACHE_ENTRIES = 50

const urlOrder: string[] = []

async function openCache(): Promise<Cache> {
  if (typeof caches === 'undefined') {
    throw new Error('Cache API is not available in this browser')
  }
  return caches.open(CACHE_NAME)
}

function touchCachedUrl(url: string): void {
  const index = urlOrder.indexOf(url)
  if (index >= 0) {
    urlOrder.splice(index, 1)
  }
  urlOrder.push(url)
}

async function evictOldestEntries(cache: Cache): Promise<void> {
  while (urlOrder.length >= MAX_CACHE_ENTRIES) {
    const oldest = urlOrder.shift()
    if (oldest) {
      await cache.delete(oldest)
    }
  }
}

export async function fetchCached(url: string): Promise<Response> {
  const cache = await openCache()
  const hit = await cache.match(url)
  if (hit) {
    touchCachedUrl(url)
    return hit
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  await evictOldestEntries(cache)
  await cache.put(url, response.clone())
  urlOrder.push(url)
  return response
}

export async function fetchCachedArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetchCached(url)
  return response.arrayBuffer()
}

export async function fetchCachedJson<T>(url: string): Promise<T> {
  const response = await fetchCached(url)
  return response.json() as Promise<T>
}
