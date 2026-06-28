import path from 'node:path'

const CONTENT_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wave': 'audio/wav',
  '.flac': 'audio/flac',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
}

export function contentTypeForPath(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

export function parseByteRange(
  rangeHeader: string,
  fileSize: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
  if (!match) return null

  const start = match[1] ? Number.parseInt(match[1], 10) : 0
  const end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= fileSize) {
    return null
  }

  return { start, end: Math.min(end, fileSize - 1) }
}
