import http from 'node:http'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import { createSessionToken, isSessionToken, MediaLibrary } from './media-access'
import { contentTypeForPath } from './media-types'

// Pages loaded with loadFile() report one of these as their origin.
const FILE_ORIGINS = ['file://', 'null']

let server: http.Server | null = null
let mediaPort: number | null = null
let sessionToken = ''
let appOrigins: string[] = FILE_ORIGINS
const library = new MediaLibrary()

export function allowMediaPaths(filePaths: string[]): void {
  for (const filePath of filePaths) library.add(filePath)
}

export function clearMediaPaths(): void {
  library.clear()
}

function handleMediaRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }

    const origin = req.headers.origin
    if (req.headers.host !== `127.0.0.1:${mediaPort}` || (origin && !appOrigins.includes(origin))) {
      res.writeHead(403).end()
      return
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname !== '/audio') {
      res.writeHead(404).end()
      return
    }

    if (!isSessionToken(sessionToken, url.searchParams.get('t'))) {
      res.writeHead(403).end()
      return
    }

    const rawPath = url.searchParams.get('p')
    if (!rawPath) {
      res.writeHead(400).end()
      return
    }

    const file = library.resolve(rawPath)
    if (!file) {
      res.writeHead(404).end()
      return
    }

    const { path: filePath, size: fileSize } = file
    const contentType = contentTypeForPath(filePath)
    const cors: Record<string, string> = origin
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : { Vary: 'Origin' }

    const rangeHeader = req.headers.range
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
      if (match) {
        const start = match[1] ? Number.parseInt(match[1], 10) : 0
        const end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1
        if (start >= 0 && start < fileSize && end >= start) {
          const boundedEnd = Math.min(end, fileSize - 1)
          const chunkSize = boundedEnd - start + 1
          res.writeHead(206, {
            ...cors,
            'Content-Type': contentType,
            'Content-Length': chunkSize,
            'Content-Range': `bytes ${start}-${boundedEnd}/${fileSize}`,
            'Accept-Ranges': 'bytes',
          })
          if (req.method === 'HEAD') {
            res.end()
            return
          }
          createReadStream(filePath, { start, end: boundedEnd }).pipe(res)
          return
        }
      }
    }

    res.writeHead(200, {
      ...cors,
      'Content-Type': contentType,
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    createReadStream(filePath).pipe(res)
  } catch (error) {
    console.error('[media-server]', error)
    res.writeHead(500).end()
  }
}

export function getMediaServerPort(): number | null {
  return mediaPort
}

export function toHttpMediaUrl(filePath: string): string {
  if (mediaPort === null) {
    throw new Error('Media server is not running')
  }
  const absolute = path.resolve(filePath)
  return `http://127.0.0.1:${mediaPort}/audio?t=${sessionToken}&p=${encodeURIComponent(absolute)}`
}

export async function ensureMediaServer(devServerUrl?: string): Promise<number> {
  if (mediaPort !== null) return mediaPort

  sessionToken = createSessionToken()
  appOrigins = devServerUrl ? [new URL(devServerUrl).origin] : FILE_ORIGINS
  server = http.createServer(handleMediaRequest)
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject)
    server!.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to bind media server')
  }
  mediaPort = address.port
  console.log(`[media-server] listening on 127.0.0.1:${mediaPort}`)
  return mediaPort
}

export function stopMediaServer(): void {
  if (!server) return
  server.close()
  server = null
  mediaPort = null
  sessionToken = ''
  library.clear()
}
