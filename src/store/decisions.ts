import { create } from 'zustand'
import type { TrackDecision } from '@/lib/types'

type HistoryEntry = {
  trackId: string
  previous: TrackDecision | undefined
}

type DecisionsState = {
  decisions: Record<string, TrackDecision>
  history: HistoryEntry[]
  decide: (trackId: string, decision: TrackDecision) => void
  patch: (trackId: string, patch: Partial<TrackDecision>) => void
  undo: () => void
  clearCommitted: (trackIds: string[]) => void
  pending: () => Record<string, TrackDecision>
  getForTrack: (trackId: string) => TrackDecision | undefined
  hydrate: (decisions: Record<string, TrackDecision>) => void
}

export const useDecisionsStore = create<DecisionsState>((set, get) => ({
  decisions: {},
  history: [],

  decide(trackId, decision) {
    const previous = get().decisions[trackId]
    set((state) => ({
      decisions: { ...state.decisions, [trackId]: decision },
      history: [...state.history, { trackId, previous }],
    }))
  },

  patch(trackId, patch) {
    const existing = get().decisions[trackId]
    const merged = { ...(existing ?? { keep: true }), ...patch }
    set((state) => ({
      decisions: { ...state.decisions, [trackId]: merged },
      history: [...state.history, { trackId, previous: existing }],
    }))
  },

  undo() {
    const { history } = get()
    if (!history.length) return
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
  },

  clearCommitted(trackIds) {
    set((state) => {
      const next = { ...state.decisions }
      for (const id of trackIds) delete next[id]
      return { decisions: next }
    })
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
