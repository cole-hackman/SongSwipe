import { describe, expect, it } from 'vitest'
import { buildSidecarEnv } from '../../electron/main/sidecar-env'

describe('buildSidecarEnv', () => {
  it('does not opt a source checkout into the real library', () => {
    const env = buildSidecarEnv({ PATH: '/bin' }, { isPackaged: false, dbPath: null })
    expect(env).toEqual({ PATH: '/bin' })
  })

  it('passes on an explicit opt-in and database path', () => {
    const env = buildSidecarEnv(
      { SONGSWIPE_ALLOW_REAL: '1' },
      { isPackaged: false, dbPath: '/tmp/copy.db' },
    )
    expect(env).toEqual({ SONGSWIPE_ALLOW_REAL: '1', SONGSWIPE_DB_PATH: '/tmp/copy.db' })
  })

  it('lets the packaged app use the real library', () => {
    expect(buildSidecarEnv({}, { isPackaged: true, dbPath: null }).SONGSWIPE_ALLOW_REAL).toBe('1')
  })
})
