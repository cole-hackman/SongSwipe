import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import { contentTypeForPath } from './media-types'

let server: http.Server | null = null
let mediaPort: number | null = null

function isSafeMediaPath(filePath: string): boolean {
  if (!path.isAbsolute(filePath)) return false
  if (filePath.includes('..')) return false
  return existsSync(filePath)
}

function handleMediaRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }

    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (url.pathname !== '/audio') {
      res.writeHead(404).end()
      return
    }

    const rawPath = url.searchParams.get('p')
    if (!rawPath) {
      res.writeHead(400).end()
      return
    }

    const filePath = path.resolve(decodeURIComponent(rawPath))
    if (!isSafeMediaPath(filePath)) {
      res.writeHead(404).end()
      return
    }

    const stat = statSync(filePath)
    if (!stat.isFile()) {
      res.writeHead(404).end()
      return
    }

    const fileSize = stat.size
    const contentType = contentTypeForPath(filePath)
    const cors = { 'Access-Control-Allow-Origin': '*' }

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
  return `http://127.0.0.1:${mediaPort}/audio?p=${encodeURIComponent(absolute)}`
}

export async function ensureMediaServer(): Promise<number> {
  if (mediaPort !== null) return mediaPort

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
}
