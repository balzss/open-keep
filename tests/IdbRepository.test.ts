import { beforeEach, describe, expect, it } from 'vitest'
import type { Note } from '@/domain/types'
import { newId } from '@/lib/id'
import { orderAtStart } from '@/lib/order'
import { IdbRepository } from '@/storage/idb/IdbRepository'

function makeNote(over: Partial<Note> = {}): Note {
  const ts = Date.now()
  return {
    id: newId(),
    kind: 'text',
    title: '',
    body: '',
    items: [],
    attachments: [],
    tagIds: [],
    archived: false,
    order: orderAtStart(null),
    createdAt: ts,
    updatedAt: ts,
    ...over,
  }
}

function makeBlob(text = 'fake-image-bytes'): Blob {
  return new Blob([text], { type: 'image/png' })
}

async function freshRepo(): Promise<IdbRepository> {
  // fake-indexeddb persists across tests; wipe both stores before each.
  const repo = new IdbRepository()
  await repo.init()
  await repo.import({ notes: [], tags: [] })
  return repo
}

async function noteById(repo: IdbRepository, id: string): Promise<Note | undefined> {
  return (await repo.export()).notes.find((n) => n.id === id)
}

describe('IdbRepository', () => {
  let repo: IdbRepository

  beforeEach(async () => {
    repo = await freshRepo()
  })

  it('persists a note verbatim and reads it back', async () => {
    const note = makeNote({ title: 'Hello', body: 'world' })
    await repo.createNote(note)
    expect(await noteById(repo, note.id)).toEqual(note)
  })

  it('patches a note and bumps updatedAt', async () => {
    const note = makeNote({ updatedAt: 1 })
    await repo.createNote(note)
    const updated = await repo.updateNote(note.id, { title: 'Renamed', archived: true })
    expect(updated.title).toBe('Renamed')
    expect(updated.archived).toBe(true)
    expect(updated.updatedAt).toBeGreaterThan(note.updatedAt)
    expect(updated.id).toBe(note.id)
  })

  it('rejects updates to a missing note', async () => {
    await expect(repo.updateNote('nope', { title: 'x' })).rejects.toThrow()
  })

  it('hard-deletes a note', async () => {
    const note = makeNote()
    await repo.createNote(note)
    await repo.deleteNote(note.id)
    expect(await noteById(repo, note.id)).toBeUndefined()
  })

  it('creates, renames, and deletes tags (detaching from notes)', async () => {
    const tag = await repo.createTag('todo')
    await repo.createNote(makeNote({ tagIds: [tag.id] }))

    const renamed = await repo.renameTag(tag.id, 'done')
    expect(renamed.name).toBe('done')

    await repo.deleteTag(tag.id)
    const { notes, tags } = await repo.export()
    expect(tags).toHaveLength(0)
    expect(notes[0].tagIds).toEqual([])
  })

  it('persists and retrieves attachment blobs', async () => {
    // fake-indexeddb's structured clone strips Blob prototype methods, so we
    // can only assert presence here. Real-browser round-trips are covered by
    // the manual smoke test; the codec is unit-tested in image.test.ts.
    const aid = newId()
    await repo.putAttachment(
      { id: aid, mime: 'image/png', width: 10, height: 5, createdAt: 1 },
      makeBlob('hello'),
    )
    expect(await repo.getAttachment(aid)).toBeDefined()
  })

  it('cascade-deletes attachment blobs when the note is deleted', async () => {
    const aid = newId()
    const note = makeNote({
      attachments: [{ id: aid, mime: 'image/png', width: 1, height: 1, createdAt: 1 }],
    })
    await repo.createNote(note)
    await repo.putAttachment(
      { id: aid, mime: 'image/png', width: 1, height: 1, createdAt: 1 },
      makeBlob(),
    )
    expect(await repo.getAttachment(aid)).toBeDefined()
    await repo.deleteNote(note.id)
    expect(await repo.getAttachment(aid)).toBeUndefined()
  })

  it('clears attachments on import', async () => {
    // Full export/import blob round-trip exercises the base64 codec, which
    // fake-indexeddb's blob mangling makes impossible to test here. We at
    // least verify the import path clears prior attachment rows.
    const aid = newId()
    await repo.putAttachment(
      { id: aid, mime: 'image/png', width: 2, height: 2, createdAt: 1 },
      makeBlob('payload'),
    )
    expect(await repo.getAttachment(aid)).toBeDefined()
    await repo.import({ notes: [], tags: [] })
    expect(await repo.getAttachment(aid)).toBeUndefined()
  })

  it('accepts legacy snapshots that pre-date attachments', async () => {
    // v1 backup: no `attachments` field, notes without `attachments` field.
    const legacyNote = {
      id: newId(),
      kind: 'text' as const,
      title: 'old',
      body: '',
      items: [],
      tagIds: [],
      archived: false,
      order: orderAtStart(null),
      createdAt: 1,
      updatedAt: 1,
    } as unknown as Note
    await repo.import({ notes: [legacyNote], tags: [] })
    const back = (await repo.export()).notes[0]
    expect(back.attachments).toEqual([])
  })

  it('round-trips through export/import', async () => {
    await repo.createNote(makeNote({ title: 'keep me' }))
    await repo.createTag('archive')
    const snapshot = await repo.export()
    expect(snapshot.notes).toHaveLength(1)
    expect(snapshot.tags).toHaveLength(1)

    await repo.import({ notes: [], tags: [] })
    expect((await repo.export()).notes).toHaveLength(0)

    await repo.import(snapshot)
    const restored = await repo.export()
    expect(restored.notes[0].title).toBe('keep me')
    expect(restored.tags[0].name).toBe('archive')
  })
})
