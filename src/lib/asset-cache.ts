const CACHE_NAME = "voice-agent-assets-v1"

async function openCache(): Promise<Cache> {
  if (typeof caches === "undefined") {
    throw new Error("Cache API is not available in this browser")
  }
  return caches.open(CACHE_NAME)
}

export async function fetchCached(url: string): Promise<Response> {
  const cache = await openCache()
  const hit = await cache.match(url)
  if (hit) {
    return hit
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  await cache.put(url, response.clone())
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
