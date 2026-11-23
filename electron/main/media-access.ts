import { randomBytes, timingSafeEqual } from 'node:crypto'
import { realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import { isAudioPath } from './media-types'

export type MediaFile = { path: string; size: number }

/** Random value that identifies one run of the media server. */
export function createSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function isSessionToken(expected: string, actual: string | null): boolean {
  if (!actual) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(actual)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The tracks the media server may play: those of the loaded library. */
export class MediaLibrary {
  private paths = new Set<string>()

  add(filePath: string): void {
    if (path.isAbsolute(filePath) && isAudioPath(filePath)) {
      this.paths.add(path.resolve(filePath))
    }
  }

  clear(): void {
    this.paths.clear()
  }

  /** Returns the file on disk for a library track, or null. */
  resolve(filePath: string): MediaFile | null {
    const requested = path.resolve(filePath)
    if (!this.paths.has(requested)) return null
    try {
      // A track can be a link, so the file it points to has to be audio too.
      const target = realpathSync(requested)
      if (!isAudioPath(target)) return null
      const stat = statSync(target)
      return stat.isFile() ? { path: target, size: stat.size } : null
    } catch {
      return null
    }
  }
}

function trackPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((track) => (track as { path?: unknown } | null)?.path)
    .filter((trackPath): trackPath is string => typeof trackPath === 'string' && trackPath !== '')
}

/** Paths of the tracks in a sidecar response. */
export function trackPathsFromResult(method: string, result: unknown): string[] {
  if (method === 'get_tracks') return trackPaths(result)
  if (method === 'get_playlist_bundle') {
    return trackPaths((result as { tracks?: unknown } | null)?.tracks)
  }
  return []
}
