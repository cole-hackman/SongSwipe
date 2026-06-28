import { ensureMediaServer, toHttpMediaUrl, stopMediaServer } from '../electron/main/media-server.ts'

async function main() {
  await ensureMediaServer()
  const file =
    '/Volumes/HACKMAN SSD/Tracks/64. Dom Dolla, Daya, Eli Brown - Dreamin (Eli Brown Extended Remix).mp3'
  const url = toHttpMediaUrl(file)
  console.log('url', url)
  const res = await fetch(url, { headers: { Range: 'bytes=0-1023' } })
  console.log('status', res.status)
  console.log('type', res.headers.get('content-type'))
  console.log('range', res.headers.get('content-range'))
  const buf = Buffer.from(await res.arrayBuffer())
  console.log('bytes', buf.length, 'head', buf.slice(0, 4).toString())
  stopMediaServer()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
