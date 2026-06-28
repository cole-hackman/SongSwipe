const cache = new Map<string, string>()
const MAX = 200

export async function getArtworkUrl(
  artworkPath: string | null,
  resolve: (path: string) => Promise<string>,
): Promise<string | null> {
  if (!artworkPath) return null
  const hit = cache.get(artworkPath)
  if (hit) return hit
  const url = await resolve(artworkPath)
  if (cache.size >= MAX) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(artworkPath, url)
  return url
}
