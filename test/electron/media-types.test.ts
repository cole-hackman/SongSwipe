import { describe, expect, it } from 'vitest'
import { contentTypeForPath, parseByteRange } from '../../electron/main/media-types'

describe('media-types', () => {
  it('maps common audio extensions', () => {
    expect(contentTypeForPath('/music/track.wav')).toBe('audio/wav')
    expect(contentTypeForPath('/music/track.mp3')).toBe('audio/mpeg')
    expect(contentTypeForPath('/music/track.aiff')).toBe('audio/aiff')
  })

  it('parses open-ended range requests', () => {
    expect(parseByteRange('bytes=0-', 68_002_608)).toEqual({
      start: 0,
      end: 68_002_607,
    })
  })

  it('parses bounded range requests', () => {
    expect(parseByteRange('bytes=100-999', 10_000)).toEqual({
      start: 100,
      end: 999,
    })
  })
})
