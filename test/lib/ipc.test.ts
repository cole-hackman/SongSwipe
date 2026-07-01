import { describe, expect, it } from 'vitest'
import { getSidecarStatus, readSession, readSettings } from '@/lib/ipc'

describe('ipc helpers', () => {
  it('rejects gracefully when preload api is unavailable', async () => {
    const previous = window.api
    // @ts-expect-error test deletes preload bridge
    delete window.api

    await expect(readSettings()).rejects.toThrow('SongSwipe API is unavailable')
    await expect(getSidecarStatus()).rejects.toThrow('SongSwipe API is unavailable')
    await expect(readSession()).rejects.toThrow('SongSwipe API is unavailable')

    window.api = previous
  })
})
