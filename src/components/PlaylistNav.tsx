import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildPlaylistTree,
  collectFolderAncestorIds,
  type PlaylistNode,
} from '@/lib/playlist-tree'
import { useQueueStore } from '@/store/queue'

const EXPANDED_STORAGE_KEY = 'songswipe-playlist-nav-expanded'

function readExpandedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

function writeExpandedIds(ids: Set<string>) {
  localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]))
}

type TreeNodeProps = {
  node: PlaylistNode
  depth: number
  selectedId: string | null
  expanded: Set<string>
  loading: boolean
  onToggleFolder: (folderId: string) => void
  onSelectPlaylist: (playlistId: string) => void
}

function PlaylistTreeNode({
  node,
  depth,
  selectedId,
  expanded,
  loading,
  onToggleFolder,
  onSelectPlaylist,
}: TreeNodeProps) {
  if (node.isFolder) {
    const isOpen = expanded.has(node.id)
    return (
      <div className="playlist-nav__branch">
        <button
          type="button"
          className="playlist-nav__folder playlist-nav__folder--styled"
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          aria-expanded={isOpen}
          onClick={() => onToggleFolder(node.id)}
        >
          <span className={`playlist-nav__chevron${isOpen ? ' is-open' : ''}`} aria-hidden />
          <span className="playlist-nav__label">{node.name}</span>
        </button>
        {isOpen
          ? node.children.map((child) => (
              <PlaylistTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                expanded={expanded}
                loading={loading}
                onToggleFolder={onToggleFolder}
                onSelectPlaylist={onSelectPlaylist}
              />
            ))
          : null}
      </div>
    )
  }

  const isSelected = selectedId === node.id
  return (
    <button
      type="button"
      className={`playlist-nav__item${isSelected ? ' is-selected' : ''}`}
      style={{ paddingLeft: `${depth * 14 + 28}px` }}
      disabled={loading}
      onClick={() => onSelectPlaylist(node.id)}
    >
      <span className="playlist-nav__label">{node.name}</span>
      {node.isSmart ? <span className="playlist-nav__badge">smart</span> : null}
    </button>
  )
}

type PlaylistNavProps = {
  searchQuery?: string
}

export function PlaylistNav({ searchQuery = '' }: PlaylistNavProps) {
  const playlists = useQueueStore((s) => s.playlists)
  const sourcePlaylistId = useQueueStore((s) => s.sourcePlaylistId)
  const loadPlaylists = useQueueStore((s) => s.loadPlaylists)
  const selectPlaylist = useQueueStore((s) => s.selectPlaylist)
  const loading = useQueueStore((s) => s.loading)
  const error = useQueueStore((s) => s.error)

  const [expanded, setExpanded] = useState<Set<string>>(() => readExpandedIds())

  useEffect(() => {
    void loadPlaylists()
  }, [loadPlaylists])

  useEffect(() => {
    if (!sourcePlaylistId) return
    const ancestors = collectFolderAncestorIds(playlists, sourcePlaylistId)
    if (!ancestors.length) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const id of ancestors) next.add(id)
      writeExpandedIds(next)
      return next
    })
  }, [playlists, sourcePlaylistId])

  const tree = useMemo(() => buildPlaylistTree(playlists), [playlists])

  const toggleFolder = (folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      writeExpandedIds(next)
      return next
    })
  }

  const matchesSearch = useCallback(
    (node: PlaylistNode): boolean => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      if (node.name.toLowerCase().includes(q)) return true
      if (node.isFolder) return node.children.some((child) => matchesSearch(child))
      return false
    },
    [searchQuery],
  )

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree
    return tree.filter((node) => matchesSearch(node))
  }, [tree, searchQuery, matchesSearch])

  const searchExpanded = useMemo(() => {
    if (!searchQuery.trim()) return expanded
    // When searching, auto-expand all folders that have matching descendants
    const autoExpand = new Set(expanded)
    function expandMatching(nodes: PlaylistNode[]) {
      for (const node of nodes) {
        if (node.isFolder && matchesSearch(node)) {
          autoExpand.add(node.id)
          expandMatching(node.children)
        }
      }
    }
    expandMatching(tree)
    return autoExpand
  }, [searchQuery, expanded, tree, matchesSearch])

  return (
    <nav className="playlist-nav" aria-label="Playlists">
      <div className="playlist-nav__header">
        <h2>Playlists</h2>
      </div>
      <div className="playlist-nav__tree">
        {error ? <p className="playlist-nav__message">{error}</p> : null}
        {!error && !filteredTree.length ? (
          <p className="playlist-nav__message">
            {loading ? 'Loading…' : searchQuery ? 'No matching playlists.' : 'No playlists found.'}
          </p>
        ) : null}
        {filteredTree.map((node) => (
          <PlaylistTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={sourcePlaylistId}
            expanded={searchQuery.trim() ? searchExpanded : expanded}
            loading={loading}
            onToggleFolder={toggleFolder}
            onSelectPlaylist={(playlistId) => void selectPlaylist(playlistId)}
          />
        ))}
      </div>
    </nav>
  )
}
