import { create } from 'zustand'
import type { DataSnapshot, ID, Note, NoteKind, Tag } from '@/domain/types'
import { now } from '@/lib/clock'
import { newId } from '@/lib/id'
import { orderAtStart, orderBetween } from '@/lib/order'
import { getRepository } from '@/storage'

type Status = 'loading' | 'ready'

/** A reversible action offered to the user via the toast. */
interface UndoOffer {
  /** Message shown in the toast, e.g. "Note archived". */
  message: string
  /** Snapshots of the affected notes as they were *before* the action. */
  notes: Note[]
}

interface NotesState {
  byId: Record<ID, Note>
  tags: Record<ID, Tag>
  status: Status
  /** Surfaced to the UI as a toast when an optimistic write is rolled back. */
  lastError: string | null
  /** Last reversible action; surfaced to the UI as an "Undo" toast. */
  undo: UndoOffer | null

  init: () => Promise<void>

  createNote: (kind: NoteKind, partial?: Partial<Note>) => Promise<ID>
  updateNote: (id: ID, patch: Partial<Note>) => Promise<void>
  setArchived: (id: ID, archived: boolean) => Promise<void>
  trashNote: (id: ID) => Promise<void>
  restoreNote: (id: ID) => Promise<void>
  /** `silent` skips the undo toast — used for non-user-initiated cleanup. */
  deleteForever: (id: ID, opts?: { silent?: boolean }) => Promise<void>
  emptyTrash: () => Promise<void>
  /** Persist a new manual order for `id` given the section's reordered id list. */
  reorderNote: (id: ID, orderedIds: ID[]) => Promise<void>

  /** Bulk operations for selection mode. */
  patchMany: (ids: ID[], changes: Partial<Note>) => Promise<void>
  removeMany: (ids: ID[]) => Promise<void>

  createTag: (name: string) => Promise<ID>
  renameTag: (id: ID, name: string) => Promise<void>
  deleteTag: (id: ID) => Promise<void>
  toggleNoteTag: (noteId: ID, tagId: ID) => Promise<void>

  exportData: () => Promise<DataSnapshot>
  importData: (data: DataSnapshot) => Promise<void>
  clearError: () => void
  /** Revert the most recently offered action, restoring the affected notes. */
  runUndo: () => Promise<void>
  clearUndo: () => void
}

/** "Note" / "3 notes" — the subject for a toast covering `count` notes. */
function pluralizeNotes(count: number): string {
  return count === 1 ? 'Note' : `${count} notes`
}

/** Build the toast message for a bulk patch based on what changed. */
function bulkMessage(count: number, changes: Partial<Note>): string {
  const subject = pluralizeNotes(count)
  if ('archived' in changes) return `${subject} ${changes.archived ? 'archived' : 'unarchived'}`
  if ('deletedAt' in changes)
    return `${subject} ${changes.deletedAt == null ? 'restored' : 'moved to trash'}`
  return `${subject} updated`
}

export const useNotesStore = create<NotesState>((set, get) => {
  const repo = getRepository()

  /**
   * Optimistic write: apply `next` to memory immediately, persist, roll back to
   * `prev` on failure. Keeps the UI snappy while staying durable.
   */
  async function commit(prev: Note, next: Note, persist: () => Promise<unknown>): Promise<void> {
    set((s) => ({ byId: { ...s.byId, [next.id]: next } }))
    try {
      await persist()
    } catch (err) {
      set((s) => ({
        byId: { ...s.byId, [prev.id]: prev },
        lastError: err instanceof Error ? err.message : 'Could not save changes',
      }))
    }
  }

  /** Patch a note in memory + storage. `stamp` controls touching updatedAt. */
  async function patch(id: ID, changes: Partial<Note>, stamp = true): Promise<void> {
    const prev = get().byId[id]
    if (!prev) return
    const next: Note = { ...prev, ...changes, id, updatedAt: stamp ? now() : prev.updatedAt }
    await commit(prev, next, () => repo.updateNote(id, { ...changes, updatedAt: next.updatedAt }))
  }

  /** Offer the user a chance to revert; only when nothing went wrong. */
  function offerUndo(message: string, notes: Note[]): void {
    if (!notes.length || get().lastError) return
    set({ undo: { message, notes } })
  }

  /**
   * Re-apply prior note snapshots to memory + storage. A `put` is an idempotent
   * upsert, so this restores both soft-edited notes and hard-deleted ones,
   * preserving their original timestamps exactly.
   */
  async function restore(notes: Note[]): Promise<void> {
    set((s) => {
      const byId = { ...s.byId }
      for (const n of notes) byId[n.id] = n
      return { byId, undo: null }
    })
    try {
      await Promise.all(notes.map((n) => repo.createNote(n)))
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : 'Could not undo' })
    }
  }

  return {
    byId: {},
    tags: {},
    status: 'loading',
    lastError: null,
    undo: null,

    async init() {
      await repo.init()
      const { notes, tags } = await repo.export()
      set({
        byId: Object.fromEntries(notes.map((n) => [n.id, n])),
        tags: Object.fromEntries(tags.map((t) => [t.id, t])),
        status: 'ready',
      })
    },

    async createNote(kind, partial) {
      const all = Object.values(get().byId)
      const minOrder = all.length
        ? all.reduce((m, n) => (n.order < m ? n.order : m), all[0].order)
        : null
      const ts = now()
      const note: Note = {
        id: newId(),
        kind,
        title: '',
        body: '',
        items: [],
        tagIds: [],
        archived: false,
        order: orderAtStart(minOrder),
        createdAt: ts,
        updatedAt: ts,
        ...partial,
      }
      set((s) => ({ byId: { ...s.byId, [note.id]: note } }))
      try {
        await repo.createNote(note)
      } catch (err) {
        set((s) => {
          const { [note.id]: _, ...rest } = s.byId
          return {
            byId: rest,
            lastError: err instanceof Error ? err.message : 'Could not create note',
          }
        })
      }
      return note.id
    },

    updateNote: (id, changes) => patch(id, changes),

    async setArchived(id, archived) {
      const prev = get().byId[id]
      await patch(id, { archived })
      if (prev) offerUndo(archived ? 'Note archived' : 'Note unarchived', [prev])
    },

    async trashNote(id) {
      const prev = get().byId[id]
      await patch(id, { deletedAt: now() })
      if (prev) offerUndo('Note moved to trash', [prev])
    },

    restoreNote: (id) => patch(id, { deletedAt: undefined }),

    async deleteForever(id, opts) {
      const prev = get().byId[id]
      if (!prev) return
      set((s) => {
        const { [id]: _, ...rest } = s.byId
        return { byId: rest }
      })
      try {
        await repo.deleteNote(id)
        if (!opts?.silent) offerUndo('Note deleted', [prev])
      } catch (err) {
        set((s) => ({
          byId: { ...s.byId, [id]: prev },
          lastError: err instanceof Error ? err.message : 'Could not delete note',
        }))
      }
    },

    async emptyTrash() {
      const trashed = Object.values(get().byId).filter((n) => n.deletedAt != null)
      await Promise.all(trashed.map((n) => get().deleteForever(n.id, { silent: true })))
      offerUndo(`${pluralizeNotes(trashed.length)} deleted`, trashed)
    },

    async reorderNote(id, orderedIds) {
      const byId = get().byId
      const idx = orderedIds.indexOf(id)
      if (idx === -1) return
      const prevNote = idx > 0 ? byId[orderedIds[idx - 1]] : null
      const nextNote = idx < orderedIds.length - 1 ? byId[orderedIds[idx + 1]] : null
      const order = orderBetween(prevNote?.order ?? null, nextNote?.order ?? null)
      await patch(id, { order }, false)
    },

    async patchMany(ids, changes) {
      const ts = now()
      const prev = get().byId
      const snapshots = ids.map((id) => prev[id]).filter((n): n is Note => n != null)
      // One optimistic state update for the whole batch.
      set((s) => {
        const byId = { ...s.byId }
        for (const id of ids) {
          if (byId[id]) byId[id] = { ...byId[id], ...changes, id, updatedAt: ts }
        }
        return { byId }
      })
      try {
        await Promise.all(ids.map((id) => repo.updateNote(id, { ...changes, updatedAt: ts })))
        offerUndo(bulkMessage(snapshots.length, changes), snapshots)
      } catch (err) {
        set((s) => {
          const byId = { ...s.byId }
          for (const id of ids) if (prev[id]) byId[id] = prev[id]
          return { byId, lastError: err instanceof Error ? err.message : 'Could not update notes' }
        })
      }
    },

    async removeMany(ids) {
      const prev = get().byId
      const snapshots = ids.map((id) => prev[id]).filter((n): n is Note => n != null)
      set((s) => {
        const byId = { ...s.byId }
        for (const id of ids) delete byId[id]
        return { byId }
      })
      try {
        await Promise.all(ids.map((id) => repo.deleteNote(id)))
        offerUndo(`${pluralizeNotes(snapshots.length)} deleted`, snapshots)
      } catch (err) {
        set((s) => {
          const byId = { ...s.byId }
          for (const id of ids) if (prev[id]) byId[id] = prev[id]
          return { byId, lastError: err instanceof Error ? err.message : 'Could not delete notes' }
        })
      }
    },

    async createTag(name) {
      const tag = await repo.createTag(name)
      set((s) => ({ tags: { ...s.tags, [tag.id]: tag } }))
      return tag.id
    },

    async renameTag(id, name) {
      const prev = get().tags[id]
      if (!prev) return
      const next = { ...prev, name: name.trim() }
      set((s) => ({ tags: { ...s.tags, [id]: next } }))
      try {
        await repo.renameTag(id, name)
      } catch (err) {
        set((s) => ({
          tags: { ...s.tags, [id]: prev },
          lastError: err instanceof Error ? err.message : 'Could not rename label',
        }))
      }
    },

    async deleteTag(id) {
      await repo.deleteTag(id)
      set((s) => {
        const { [id]: _, ...tags } = s.tags
        // Detach from notes in memory to match the store-side cascade.
        const byId = Object.fromEntries(
          Object.entries(s.byId).map(([nid, n]) => [
            nid,
            n.tagIds.includes(id) ? { ...n, tagIds: n.tagIds.filter((t) => t !== id) } : n,
          ]),
        )
        return { tags, byId }
      })
    },

    async toggleNoteTag(noteId, tagId) {
      const note = get().byId[noteId]
      if (!note) return
      const tagIds = note.tagIds.includes(tagId)
        ? note.tagIds.filter((t) => t !== tagId)
        : [...note.tagIds, tagId]
      await patch(noteId, { tagIds })
    },

    exportData: () => repo.export(),

    async importData(data) {
      await repo.import(data)
      set({
        byId: Object.fromEntries(data.notes.map((n) => [n.id, n])),
        tags: Object.fromEntries(data.tags.map((t) => [t.id, t])),
      })
    },

    clearError: () => set({ lastError: null }),

    async runUndo() {
      const offer = get().undo
      if (offer) await restore(offer.notes)
    },

    clearUndo: () => set({ undo: null }),
  }
})
