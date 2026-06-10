import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { DataSnapshot, ID, Note, Tag } from '@/domain/types'
import { now } from '@/lib/clock'
import { newId } from '@/lib/id'
import type { Repository } from '../Repository'

const DB_NAME = 'open-keep'
const DB_VERSION = 1

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
}

export class IdbRepository implements Repository {
  private db: IDBPDatabase<OpenKeepDB> | null = null

  async init(): Promise<void> {
    if (this.db) return
    this.db = await openDB<OpenKeepDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          const notes = db.createObjectStore('notes', { keyPath: 'id' })
          notes.createIndex('by-updatedAt', 'updatedAt')
        }
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' })
        }
      },
    })
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
    await this.conn.delete('notes', id)
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
    const [notes, tags] = await Promise.all([this.conn.getAll('notes'), this.conn.getAll('tags')])
    return { notes, tags }
  }

  async import(data: DataSnapshot): Promise<void> {
    const tx = this.conn.transaction(['notes', 'tags'], 'readwrite')
    await Promise.all([tx.objectStore('notes').clear(), tx.objectStore('tags').clear()])
    for (const note of data.notes) await tx.objectStore('notes').put(note)
    for (const tag of data.tags) await tx.objectStore('tags').put(tag)
    await tx.done
  }
}
