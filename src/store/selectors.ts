import { useMemo } from 'react'
import type { ID, Note, Tag } from '@/domain/types'
import { byOrder } from '@/lib/order'
import { useNotesStore } from './useNotesStore'
import { useUiStore, type View } from './useUiStore'

/** Case-insensitive match across a note's title, body, and checklist items. */
function matches(note: Note, needle: string): boolean {
  if (!needle) return true
  const hay = `${note.title} ${note.body} ${note.items.map((i) => i.text).join(' ')}`.toLowerCase()
  return hay.includes(needle)
}

/** Whether a note carries any real content (title, body, item, or image). */
function hasContent(note: Note): boolean {
  return Boolean(
    note.title.trim() ||
      note.body.trim() ||
      note.items.some((i) => i.text.trim()) ||
      note.attachments.length > 0,
  )
}

function displaySort(a: Note, b: Note): number {
  return byOrder(a, b) || b.updatedAt - a.updatedAt
}

export interface NoteFilter {
  view: View
  activeTagId: ID | null
  search: string
}

/**
 * Pure filter + sort behind {@link useVisibleNotes}. Exported so it can be unit
 * tested without rendering: returns the visible notes for a view/tag/search.
 */
export function visibleNotes(
  byId: Record<ID, Note>,
  { view, activeTagId, search }: NoteFilter,
): Note[] {
  const needle = search.trim().toLowerCase()
  return Object.values(byId)
    .filter((n) => {
      const trashed = n.deletedAt != null
      if (view === 'trash') return trashed && matches(n, needle)
      if (trashed) return false
      // A content-empty note is one being authored right now: the editor seeds a
      // blank checklist row and discards the note on close if nothing was typed.
      // Keep it out of the grid so a half-formed card doesn't flicker in behind
      // the editor — it appears once it actually has content.
      if (!hasContent(n)) return false
      if (view === 'archive') return n.archived && matches(n, needle)
      // Active view: hide archived notes and apply the tag filter.
      if (n.archived) return false
      if (activeTagId && !n.tagIds.includes(activeTagId)) return false
      return matches(n, needle)
    })
    .sort(displaySort)
}

/**
 * Derives the visible, sorted note list from the in-memory store + current
 * view/tag/search filter. Memoized so typing in search doesn't thrash.
 */
export function useVisibleNotes(): Note[] {
  const byId = useNotesStore((s) => s.byId)
  const view = useUiStore((s) => s.view)
  const activeTagId = useUiStore((s) => s.activeTagId)
  const search = useUiStore((s) => s.search)

  return useMemo(
    () => visibleNotes(byId, { view, activeTagId, search }),
    [byId, view, activeTagId, search],
  )
}

/** A single note by id (stable selector for NoteCard/editor). */
export function useNote(id: ID | null): Note | undefined {
  return useNotesStore((s) => (id ? s.byId[id] : undefined))
}

/** All tags, sorted by name. */
export function useTags(): Tag[] {
  const tags = useNotesStore((s) => s.tags)
  return useMemo(() => Object.values(tags).sort((a, b) => a.name.localeCompare(b.name)), [tags])
}

/** Count of live (non-archived, non-trashed) notes carrying each tag. */
export function useTagCounts(): Record<ID, number> {
  const byId = useNotesStore((s) => s.byId)
  return useMemo(() => {
    const counts: Record<ID, number> = {}
    for (const n of Object.values(byId)) {
      if (n.archived || n.deletedAt != null) continue
      for (const t of n.tagIds) counts[t] = (counts[t] ?? 0) + 1
    }
    return counts
  }, [byId])
}
