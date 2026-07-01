import { create } from 'zustand'
import type { TrackDecision } from '@/lib/types'

type HistoryEntry = {
  trackId: string
  previous: TrackDecision | undefined
  queueIndex: number
}

type DecisionsState = {
  decisions: Record<string, TrackDecision>
  history: HistoryEntry[]
  decide: (trackId: string, decision: TrackDecision, queueIndex: number) => void
  patch: (trackId: string, patch: Partial<TrackDecision>) => void
  updateDecision: (trackId: string, patch: Partial<TrackDecision>) => void
  removeDecision: (trackId: string) => void
  undo: () => HistoryEntry | null
  clearCommitted: (trackIds: string[]) => void
  resetDecisions: (mode: 'all' | 'keep' | 'cut') => number
  pending: () => Record<string, TrackDecision>
  getForTrack: (trackId: string) => TrackDecision | undefined
  hydrate: (decisions: Record<string, TrackDecision>) => void
}

export const useDecisionsStore = create<DecisionsState>((set, get) => ({
  decisions: {},
  history: [],

  decide(trackId, decision, queueIndex) {
    const previous = get().decisions[trackId]
    set((state) => ({
      decisions: { ...state.decisions, [trackId]: decision },
      history: [...state.history, { trackId, previous, queueIndex }],
    }))
  },

  patch(trackId, patch) {
    const existing = get().decisions[trackId]
    const merged = { ...(existing ?? { keep: true }), ...patch }
    set((state) => ({
      decisions: { ...state.decisions, [trackId]: merged },
      history: state.history,
    }))
  },

  updateDecision(trackId, patch) {
    get().patch(trackId, patch)
  },

  removeDecision(trackId) {
    set((state) => {
      const next = { ...state.decisions }
      delete next[trackId]
      return { decisions: next }
    })
  },

  undo() {
    const { history } = get()
    if (!history.length) return null
    const last = history[history.length - 1]
    set((state) => {
      const next = { ...state.decisions }
      if (last.previous) {
        next[last.trackId] = last.previous
      } else {
        delete next[last.trackId]
      }
      return {
        decisions: next,
        history: state.history.slice(0, -1),
      }
    })
    return last
  },

  clearCommitted(trackIds) {
    set((state) => {
      const next = { ...state.decisions }
      for (const id of trackIds) delete next[id]
      return { decisions: next }
    })
  },

  resetDecisions(mode) {
    const current = get().decisions
    const next: Record<string, TrackDecision> = {}
    let removed = 0
    for (const [trackId, decision] of Object.entries(current)) {
      const matches =
        mode === 'all' ||
        (mode === 'keep' && decision.keep) ||
        (mode === 'cut' && !decision.keep)
      if (matches) {
        removed += 1
      } else {
        next[trackId] = decision
      }
    }
    if (removed > 0) set({ decisions: next, history: [] })
    return removed
  },

  pending() {
    return get().decisions
  },

  getForTrack(trackId) {
    return get().decisions[trackId]
  },

  hydrate(decisions) {
    set({ decisions: { ...decisions }, history: [] })
  },
}))
