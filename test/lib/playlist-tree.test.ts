import { describe, expect, it } from 'vitest'
import { buildPlaylistTree, collectFolderAncestorIds } from '@/lib/playlist-tree'
import type { Playlist } from '@/lib/types'

const playlists: Playlist[] = [
  { id: 'folder-a', name: 'Folder A', parentId: 'root', isFolder: true, sortIndex: 1 },
  { id: 'pl-2', name: 'Beta', parentId: 'folder-a', isFolder: false, sortIndex: 2 },
  { id: 'pl-1', name: 'Alpha', parentId: 'folder-a', isFolder: false, sortIndex: 1 },
  { id: 'folder-b', name: 'Folder B', parentId: 'root', isFolder: true, sortIndex: 0 },
  { id: 'pl-3', name: 'Gamma', parentId: 'folder-b', isFolder: false, isSmart: true, sortIndex: 0 },
]

describe('buildPlaylistTree', () => {
  it('builds nested folders in rekordbox order', () => {
    const tree = buildPlaylistTree(playlists)
    expect(tree.map((node) => node.id)).toEqual(['folder-b', 'folder-a'])
    expect(tree[0].children.map((node) => node.id)).toEqual(['pl-3'])
    expect(tree[1].children.map((node) => node.id)).toEqual(['pl-1', 'pl-2'])
  })
})

describe('collectFolderAncestorIds', () => {
  it('returns parent folders for a nested playlist', () => {
    expect(collectFolderAncestorIds(playlists, 'pl-2')).toEqual(['folder-a'])
  })
})
