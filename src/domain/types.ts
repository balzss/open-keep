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

/**
 * Image attached to a note. The pixel data lives in a separate IDB store keyed
 * by `id`; this metadata stays on the note so cards can render without a second
 * round-trip (intrinsic size for aspect-ratio, count for the "+N more" badge).
 */
export interface AttachmentMeta {
  id: ID
  /** MIME of the stored blob, e.g. "image/jpeg". */
  mime: string
  width: number
  height: number
  createdAt: Timestamp
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
  /** Ordered list of images attached to this note. Blobs live in storage. */
  attachments: AttachmentMeta[]
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

/**
 * A blob serialized for transport in {@link DataSnapshot}. Inline base64 keeps
 * backups single-file at the cost of ~33% size — fine for v1; switch to a zip
 * envelope when users hit real photo libraries.
 */
export interface AttachmentBlob {
  id: ID
  mime: string
  /** base64 (no `data:` prefix). */
  data: string
}

/** Full snapshot used by export/import and the future sync/migration paths. */
export interface DataSnapshot {
  notes: Note[]
  tags: Tag[]
  /** Optional for backwards-compat with v1 backups that pre-date attachments. */
  attachments?: AttachmentBlob[]
}
