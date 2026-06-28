import type { Playlist } from '@/lib/types'

export type PlaylistNode = Playlist & {
  children: PlaylistNode[]
}

export function normalizeParentId(parentId: string | null | undefined): string | null {
  if (!parentId || parentId === 'root' || parentId === '0') return null
  return parentId
}

function comparePlaylistNodes(a: PlaylistNode, b: PlaylistNode): number {
  const orderA = a.sortIndex ?? Number.MAX_SAFE_INTEGER
  const orderB = b.sortIndex ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export function buildPlaylistTree(playlists: Playlist[]): PlaylistNode[] {
  const byId = new Map<string, PlaylistNode>()
  for (const playlist of playlists) {
    byId.set(playlist.id, { ...playlist, children: [] })
  }

  const roots: PlaylistNode[] = []
  for (const playlist of playlists) {
    const node = byId.get(playlist.id)
    if (!node) continue

    const parentId = normalizeParentId(playlist.parentId)
    const parent = parentId ? byId.get(parentId) : null
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: PlaylistNode[]) => {
    nodes.sort(comparePlaylistNodes)
    for (const node of nodes) {
      sortNodes(node.children)
    }
  }

  sortNodes(roots)
  return roots
}

export function collectFolderAncestorIds(playlists: Playlist[], targetId: string): string[] {
  const byId = new Map(playlists.map((playlist) => [playlist.id, playlist]))
  const ancestors: string[] = []
  let current = byId.get(targetId)

  while (current) {
    const parentId = normalizeParentId(current.parentId)
    if (!parentId) break
    ancestors.push(parentId)
    current = byId.get(parentId)
  }

  return ancestors
}
