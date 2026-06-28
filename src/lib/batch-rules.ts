import type { BatchRule, Track } from '@/lib/types'

export function evaluateRules(track: Track, rules: BatchRule[]): BatchRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue
    if (matches(track, rule)) return rule
  }
  return null
}

function matches(track: Track, rule: BatchRule): boolean {
  if (rule.field === 'bpm') {
    const bpm = track.bpm ?? 0
    const v = Number(rule.value ?? 0)
    if (rule.op === 'lt') return bpm < v
    if (rule.op === 'gt') return bpm > v
    if (rule.op === 'eq') return bpm === v
  }
  if (rule.field === 'rating') {
    if (rule.op === 'empty') return track.rating === 0
    const v = Number(rule.value ?? 0)
    if (rule.op === 'eq') return track.rating === v
  }
  if (rule.field === 'key') {
    if (rule.op === 'empty') return !track.key
    if (rule.op === 'eq') return track.key === String(rule.value ?? '')
  }
  return false
}
