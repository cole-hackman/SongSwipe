import { getCachedPeaks, saveCachedPeaks } from '@/lib/ipc'

export async function loadPeaksForPath(filePath: string) {
  if (!filePath) return null
  const entry = await getCachedPeaks(filePath)
  if (!entry) return null
  return { peaks: entry.peaks, duration: entry.duration }
}

export async function persistPeaks(filePath: string, peaks: number[][], duration: number) {
  if (!filePath || !peaks.length) return
  await saveCachedPeaks(filePath, peaks, duration)
}
