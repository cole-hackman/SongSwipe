// @vitest-environment node
import http from 'node:http'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { trackPathsFromResult } from '../../electron/main/media-access'
import {
  allowMediaPaths,
  clearMediaPaths,
  ensureMediaServer,
  stopMediaServer,
  toHttpMediaUrl,
} from '../../electron/main/media-server'

const DEV_URL = 'http://localhost:5173/'

type Reply = { status: number; headers: http.IncomingHttpHeaders; body: string }

function get(url: string, headers: Record<string, string> = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    http
      .get(url, { headers, agent: false }, (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }))
      })
      .on('error', reject)
  })
}

describe('media-server', () => {
  let dir: string
  let track: string

  beforeEach(async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'songswipe-media-'))
    track = path.join(dir, '100% Track...mp3')
    writeFileSync(track, 'audio')
    await ensureMediaServer(DEV_URL)
    allowMediaPaths([track])
  })

  afterEach(() => {
    stopMediaServer()
    rmSync(dir, { recursive: true, force: true })
  })

  it('plays a library track', async () => {
    const reply = await get(toHttpMediaUrl(track))
    expect(reply.status).toBe(200)
    expect(reply.body).toBe('audio')
    expect(reply.headers['content-type']).toBe('audio/mpeg')
    expect(reply.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('answers range requests', async () => {
    const reply = await get(toHttpMediaUrl(track), { Range: 'bytes=1-2' })
    expect(reply.status).toBe(206)
    expect(reply.body).toBe('ud')
  })

  it('requires the session token', async () => {
    const url = new URL(toHttpMediaUrl(track))
    url.searchParams.set('t', 'x'.repeat(64))
    expect((await get(url.href)).status).toBe(403)
    url.searchParams.delete('t')
    expect((await get(url.href)).status).toBe(403)
  })

  it('uses a new token for every session', async () => {
    const before = new URL(toHttpMediaUrl(track)).searchParams.get('t')
    stopMediaServer()
    await ensureMediaServer(DEV_URL)
    expect(new URL(toHttpMediaUrl(track)).searchParams.get('t')).not.toBe(before)
  })

  it('serves only tracks of the loaded library', async () => {
    const other = path.join(dir, 'other.mp3')
    writeFileSync(other, 'other')
    expect((await get(toHttpMediaUrl(other))).status).toBe(404)

    clearMediaPaths()
    expect((await get(toHttpMediaUrl(track))).status).toBe(404)
  })

  it('serves only audio files', async () => {
    const text = path.join(dir, 'notes.txt')
    writeFileSync(text, 'notes')
    const link = path.join(dir, 'link.mp3')
    symlinkSync(text, link)
    const folder = path.join(dir, 'folder.mp3')
    mkdirSync(folder)
    allowMediaPaths([text, link, folder])

    for (const filePath of [text, link, folder]) {
      expect((await get(toHttpMediaUrl(filePath))).status).toBe(404)
    }
  })

  it('follows a library link to an audio file', async () => {
    const link = path.join(dir, 'linked.mp3')
    symlinkSync(track, link)
    allowMediaPaths([link])
    expect((await get(toHttpMediaUrl(link))).status).toBe(200)
  })

  it('accepts only the app origin and host', async () => {
    const url = toHttpMediaUrl(track)
    const own = await get(url, { Origin: 'http://localhost:5173' })
    expect(own.status).toBe(200)
    expect(own.headers['access-control-allow-origin']).toBe('http://localhost:5173')

    expect((await get(url, { Origin: 'https://example.com' })).status).toBe(403)
    expect((await get(url, { Origin: 'null' })).status).toBe(403)
    expect((await get(url, { Host: 'example.com' })).status).toBe(403)
  })

  it('accepts the packaged app origin without a dev server', async () => {
    stopMediaServer()
    await ensureMediaServer()
    allowMediaPaths([track])
    expect((await get(toHttpMediaUrl(track), { Origin: 'file://' })).status).toBe(200)
    expect((await get(toHttpMediaUrl(track), { Origin: 'http://localhost:5173' })).status).toBe(403)
  })
})

describe('trackPathsFromResult', () => {
  it('reads track paths from playlist responses only', () => {
    const tracks = [{ path: '/music/a.mp3' }, { path: '' }, null]
    expect(trackPathsFromResult('get_tracks', tracks)).toEqual(['/music/a.mp3'])
    expect(trackPathsFromResult('get_playlist_bundle', { tracks })).toEqual(['/music/a.mp3'])
    expect(trackPathsFromResult('list_backups', tracks)).toEqual([])
    expect(trackPathsFromResult('get_playlist_bundle', null)).toEqual([])
  })
})
