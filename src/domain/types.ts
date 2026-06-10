/**
 * Core domain model. Designed to be sync-ready (stable IDs, fractional ordering,
 * soft-delete tombstones, updatedAt) even though v1 is client-only.
 */

export type ID = string
/** Epoch milliseconds. Sortable; the sync phase may upgrade this to an HLC. */
export type Timestamp = number
/** fractional-indexing key, e.g. "a0", "a0V". Lets us reorder with one write. */
export type OrderKey = string

export type NoteKind = 'text' | 'checklist'

export interface ChecklistItem {
  id: ID
  text: string
  checked: boolean
  /** Fractional ordering within the note. */
  order: OrderKey
}

export interface Note {
  id: ID
  /** Discriminator. text↔checklist conversion is a flag flip, not a migration. */
  kind: NoteKind
  title: string
  /** Body text for `kind === 'text'`; '' for checklists. */
  body: string
  /** Items for `kind === 'checklist'`; [] for text notes. */
  items: ChecklistItem[]
  tagIds: ID[]
  archived: boolean
  /** Manual drag order within the list. */
  order: OrderKey
  createdAt: Timestamp
  updatedAt: Timestamp
  /** Tombstone: set when trashed. Propagates during future sync; purged later. */
  deletedAt?: Timestamp
}

export interface Tag {
  id: ID
  name: string
  createdAt: Timestamp
}

/** Full snapshot used by export/import and the future sync/migration paths. */
export interface DataSnapshot {
  notes: Note[]
  tags: Tag[]
}
