import { describe, expect, it } from 'vitest'
import {
  describeMissingSidecarPath,
  normalizeSidecarCallFailure,
} from '../../electron/main/sidecar-errors'

describe('sidecar error helpers', () => {
  it('describes missing sidecar paths with actionable wording', () => {
    expect(describeMissingSidecarPath('executable', '/tmp/.venv/bin/python3')).toContain('not found')
    expect(describeMissingSidecarPath('script', '/tmp/sidecar/rb_bridge.py')).toContain('rb_bridge.py')
  })

  it('prefers stderr over raw EPIPE when sidecar startup already emitted detail', () => {
    const error = normalizeSidecarCallFailure(new Error('write EPIPE'), 'ModuleNotFoundError: pyrekordbox')
    expect(error.message).toBe('ModuleNotFoundError: pyrekordbox')
  })

  it('replaces raw EPIPE with a clearer dead-process message when stderr is empty', () => {
    const error = normalizeSidecarCallFailure(new Error('write EPIPE'), '')
    expect(error.message).toBe('Sidecar process exited before responding')
  })
})
