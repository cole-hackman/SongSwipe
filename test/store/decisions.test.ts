import { beforeEach, describe, expect, it } from 'vitest'
import { useDecisionsStore } from '@/store/decisions'

describe('decisions store', () => {
  beforeEach(() => {
    useDecisionsStore.setState({ decisions: {}, history: [] })
  })

  it('decides and undoes a track decision', () => {
    const { decide, undo, getForTrack } = useDecisionsStore.getState()
    decide('track-1', { keep: true, rating: 4 })
    expect(getForTrack('track-1')).toEqual({ keep: true, rating: 4 })
    undo()
    expect(getForTrack('track-1')).toBeUndefined()
  })

  it('patches an existing decision', () => {
    const { patch, getForTrack } = useDecisionsStore.getState()
    patch('track-2', { keep: true })
    patch('track-2', { colorId: 5 })
    expect(getForTrack('track-2')).toEqual({ keep: true, colorId: 5 })
  })
})
