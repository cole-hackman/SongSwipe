import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export type PeakCacheEntry = {
  filePath: string
  duration: number
  peaks: number[][]
  updatedAt: string
}

function cacheDir(): string {
  return path.join(app.getPath('userData'), 'peak-cache')
}

function cachePath(filePath: string): string {
  const hash = createHash('sha256').update(filePath).digest('hex')
  return path.join(cacheDir(), `${hash}.json`)
}

export async function getCachedPeaks(filePath: string): Promise<PeakCacheEntry | null> {
  try {
    const raw = await readFile(cachePath(filePath), 'utf8')
    return JSON.parse(raw) as PeakCacheEntry
  } catch {
    return null
  }
}

export async function saveCachedPeaks(
  filePath: string,
  peaks: number[][],
  duration: number,
): Promise<void> {
  await mkdir(cacheDir(), { recursive: true })
  const entry: PeakCacheEntry = {
    filePath,
    duration,
    peaks,
    updatedAt: new Date().toISOString(),
  }
  await writeFile(cachePath(filePath), JSON.stringify(entry))
}
