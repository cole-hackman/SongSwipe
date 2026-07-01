import { describe, expect, it } from 'vitest'
import { evaluateRules } from '@/lib/batch-rules'
import type { BatchRule } from '@/lib/types'

const track = {
  id: '1',
  path: '',
  title: '',
  artist: '',
  album: '',
  bpm: 100,
  key: '8A',
  rating: 0,
  colorId: 0,
  durationSec: 200,
  artworkPath: null,
}

describe('evaluateRules', () => {
  it('suggests cut when BPM below threshold', () => {
    const rules: BatchRule[] = [
      { id: 'r1', enabled: true, field: 'bpm', op: 'lt', value: 110, action: 'suggest_cut' },
    ]
    expect(evaluateRules(track, rules)?.action).toBe('suggest_cut')
  })
})
