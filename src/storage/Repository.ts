import type { DataSnapshot, ID, Note, Tag } from '@/domain/types'

/**
 * Persistence boundary. Every method is async — even the IndexedDB adapter whose
 * work is local — so that swapping in a SQLite/OPFS or HTTP adapter later is a
 * zero-call-site change. Nothing above this layer may touch a concrete store.
 *
 * v1 loads every note into memory (via {@link Repository.export}) and does its
 * filtering/sorting/search there (see `store/selectors`), so this stays a thin
 * CRUD + snapshot layer. A server-backed adapter would add query methods here.
 */
export interface Repository {
  /** Open the DB and run migrations. Must be called once before any other method. */
  init(): Promise<void>

  // Notes — the caller constructs the full note (ids, order, timestamps).
  createNote(note: Note): Promise<void>
  /** Shallow-merges `patch` and stamps `updatedAt`. Returns the updated note. */
  updateNote(id: ID, patch: Partial<Note>): Promise<Note>
  /** Hard delete (e.g. purge from trash). Soft delete is `updateNote(deletedAt)`. */
  deleteNote(id: ID): Promise<void>

  // Tags
  createTag(name: string): Promise<Tag>
  renameTag(id: ID, name: string): Promise<Tag>
  /** Deletes the tag and detaches it from every note. */
  deleteTag(id: ID): Promise<void>

  // Backup / migration / future-sync seam
  export(): Promise<DataSnapshot>
  import(data: DataSnapshot): Promise<void>
}
