import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { AttachmentBlob, AttachmentMeta, DataSnapshot, ID, Note, Tag } from '@/domain/types'
import { now } from '@/lib/clock'
import { newId } from '@/lib/id'
import { blobToBase64, decodeBase64ToBlob } from '@/lib/image'
import type { Repository } from '../Repository'

const DB_NAME = 'open-keep'
const DB_VERSION = 2

/** Row stored in the `attachments` object store. */
interface AttachmentRow {
  id: ID
  mime: string
  blob: Blob
}

interface OpenKeepDB extends DBSchema {
  notes: {
    key: ID
    value: Note
    indexes: { 'by-updatedAt': number }
  }
  tags: {
    key: ID
    value: Tag
  }
  attachments: {
    key: ID
    value: AttachmentRow
  }
}

export class IdbRepository implements Repository {
  private db: IDBPDatabase<OpenKeepDB> | null = null

  async init(): Promise<void> {
    if (this.db) return
    this.db = await openDB<OpenKeepDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('notes')) {
          const notes = db.createObjectStore('notes', { keyPath: 'id' })
          notes.createIndex('by-updatedAt', 'updatedAt')
        }
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' })
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments', { keyPath: 'id' })
        }
      },
    })
    // Backfill `attachments: []` on notes written before v2 so every code path
    // can assume the array is present. Done outside the upgrade tx so a crash
    // during the original migration doesn't leave notes half-typed forever.
    await this.backfillAttachmentsField()
  }

  private async backfillAttachmentsField(): Promise<void> {
    const tx = this.conn.transaction('notes', 'readwrite')
    let cursor = await tx.store.openCursor()
    while (cursor) {
      const note = cursor.value
      if (!Array.isArray(note.attachments)) {
        await cursor.update({ ...note, attachments: [] })
      }
      cursor = await cursor.continue()
    }
    await tx.done
  }

  private get conn(): IDBPDatabase<OpenKeepDB> {
    if (!this.db) throw new Error('Repository.init() must be called before use')
    return this.db
  }

  async createNote(note: Note): Promise<void> {
    await this.conn.put('notes', note)
  }

  async updateNote(id: ID, patch: Partial<Note>): Promise<Note> {
    const tx = this.conn.transaction('notes', 'readwrite')
    const current = await tx.store.get(id)
    if (!current) {
      await tx.done
      throw new Error(`Note not found: ${id}`)
    }
    const next: Note = { ...current, ...patch, id: current.id, updatedAt: now() }
    await tx.store.put(next)
    await tx.done
    return next
  }

  async deleteNote(id: ID): Promise<void> {
    // Cascade-delete the note's attachment blobs in the same transaction —
    // crash mid-delete can't leak orphan blobs the UI can never reach.
    const tx = this.conn.transaction(['notes', 'attachments'], 'readwrite')
    const note = await tx.objectStore('notes').get(id)
    await tx.objectStore('notes').delete(id)
    if (note) {
      const attachments = tx.objectStore('attachments')
      for (const a of note.attachments ?? []) {
        await attachments.delete(a.id)
      }
    }
    await tx.done
  }

  async putAttachment(meta: AttachmentMeta, blob: Blob): Promise<void> {
    await this.conn.put('attachments', { id: meta.id, mime: meta.mime, blob })
  }

  async getAttachment(id: ID): Promise<Blob | undefined> {
    const row = await this.conn.get('attachments', id)
    return row?.blob
  }

  async deleteAttachment(id: ID): Promise<void> {
    await this.conn.delete('attachments', id)
  }

  async createTag(name: string): Promise<Tag> {
    const tag: Tag = { id: newId(), name: name.trim(), createdAt: now() }
    await this.conn.put('tags', tag)
    return tag
  }

  async renameTag(id: ID, name: string): Promise<Tag> {
    const tx = this.conn.transaction('tags', 'readwrite')
    const current = await tx.store.get(id)
    if (!current) {
      await tx.done
      throw new Error(`Tag not found: ${id}`)
    }
    const next: Tag = { ...current, name: name.trim() }
    await tx.store.put(next)
    await tx.done
    return next
  }

  async deleteTag(id: ID): Promise<void> {
    // Delete the tag and detach it from every note in one transaction.
    const tx = this.conn.transaction(['tags', 'notes'], 'readwrite')
    await tx.objectStore('tags').delete(id)
    const notes = tx.objectStore('notes')
    let cursor = await notes.openCursor()
    while (cursor) {
      const note = cursor.value
      if (note.tagIds.includes(id)) {
        await cursor.update({ ...note, tagIds: note.tagIds.filter((t) => t !== id) })
      }
      cursor = await cursor.continue()
    }
    await tx.done
  }

  async export(): Promise<DataSnapshot> {
    const [notes, tags, attachments] = await Promise.all([
      this.conn.getAll('notes'),
      this.conn.getAll('tags'),
      this.conn.getAll('attachments'),
    ])
    const serialized: AttachmentBlob[] = await Promise.all(
      attachments.map(async (row) => ({
        id: row.id,
        mime: row.mime,
        data: await blobToBase64(row.blob),
      })),
    )
    return { notes, tags, attachments: serialized }
  }

  async import(data: DataSnapshot): Promise<void> {
    const tx = this.conn.transaction(['notes', 'tags', 'attachments'], 'readwrite')
    await Promise.all([
      tx.objectStore('notes').clear(),
      tx.objectStore('tags').clear(),
      tx.objectStore('attachments').clear(),
    ])
    for (const note of data.notes) {
      // Tolerate v1 backups that pre-date the attachments field.
      await tx.objectStore('notes').put({ ...note, attachments: note.attachments ?? [] })
    }
    for (const tag of data.tags) await tx.objectStore('tags').put(tag)
    for (const a of data.attachments ?? []) {
      await tx.objectStore('attachments').put({
        id: a.id,
        mime: a.mime,
        blob: decodeBase64ToBlob(a.data, a.mime),
      })
    }
    await tx.done
  }
}
