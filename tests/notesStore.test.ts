import { beforeEach, describe, expect, it, vi } from 'vitest'
import { byOrder, orderBetween } from '@/lib/order'
import { getRepository } from '@/storage'
import { useNotesStore } from '@/store/useNotesStore'

const store = () => useNotesStore.getState()

async function reset() {
  await store().init()
  await store().importData({ notes: [], tags: [] })
  store().clearError()
  store().clearUndo()
}

describe('useNotesStore', () => {
  beforeEach(reset)

  it('inserts newly created notes at the top of the order', async () => {
    const a = await store().createNote('text', { title: 'a' })
    const b = await store().createNote('text', { title: 'b' })
    const notes = Object.values(store().byId)
    const sorted = notes.sort(byOrder)
    // b created last → smallest order → first.
    expect(sorted[0].id).toBe(b)
    expect(sorted[1].id).toBe(a)
  })

  it('reorders a note between neighbors', async () => {
    const a = await store().createNote('text', { title: 'a' })
    const b = await store().createNote('text', { title: 'b' })
    const c = await store().createNote('text', { title: 'c' })
    // New notes insert at the top, so order is now [c, b, a]. Move a to the middle.
    await store().reorderNote(a, [c, a, b])
    const sorted = Object.values(store().byId).sort(byOrder)
    expect(sorted.map((n) => n.id)).toEqual([c, a, b])
  })

  it('reorders checklist items via fractional order keys', async () => {
    const id = await store().createNote('checklist')
    await store().updateNote(id, {
      items: [
        { id: 'ia', text: 'a', checked: false, order: 'a0' },
        { id: 'ib', text: 'b', checked: false, order: 'a1' },
        { id: 'ic', text: 'c', checked: false, order: 'a2' },
      ],
    })

    const items = [...store().byId[id].items].sort(byOrder)
    expect(items.map((i) => i.text)).toEqual(['a', 'b', 'c'])

    // Simulate dragging 'c' between 'a' and 'b' by giving it an order key between them.
    const [a, b, c] = items
    const between = orderBetween(a.order, b.order)
    await store().updateNote(id, {
      items: store().byId[id].items.map((i) => (i.id === c.id ? { ...i, order: between } : i)),
    })

    const reordered = [...store().byId[id].items].sort(byOrder)
    expect(reordered.map((i) => i.text)).toEqual(['a', 'c', 'b'])
  })

  it('toggles a tag on a note and detaches it on tag delete', async () => {
    const noteId = await store().createNote('text')
    const tagId = await store().createTag('work')
    await store().toggleNoteTag(noteId, tagId)
    expect(store().byId[noteId].tagIds).toEqual([tagId])

    await store().deleteTag(tagId)
    expect(store().tags[tagId]).toBeUndefined()
    expect(store().byId[noteId].tagIds).toEqual([])
  })

  it('trashes, restores, and permanently deletes notes', async () => {
    const id = await store().createNote('text')
    await store().trashNote(id)
    expect(store().byId[id].deletedAt).toBeTypeOf('number')
    await store().restoreNote(id)
    expect(store().byId[id].deletedAt).toBeUndefined()
    await store().deleteForever(id)
    expect(store().byId[id]).toBeUndefined()
  })

  it('bulk-archives and bulk-deletes selected notes', async () => {
    const a = await store().createNote('text', { title: 'a' })
    const b = await store().createNote('text', { title: 'b' })
    const c = await store().createNote('text', { title: 'c' })

    await store().patchMany([a, b], { archived: true })
    expect(store().byId[a].archived).toBe(true)
    expect(store().byId[b].archived).toBe(true)
    expect(store().byId[c].archived).toBe(false)

    await store().removeMany([a, c])
    expect(store().byId[a]).toBeUndefined()
    expect(store().byId[c]).toBeUndefined()
    expect(store().byId[b]).toBeTruthy()
  })

  it('offers an undo that reverses archiving a note', async () => {
    const id = await store().createNote('text')
    await store().setArchived(id, true)
    expect(store().byId[id].archived).toBe(true)
    expect(store().undo?.message).toBe('Note archived')

    await store().runUndo()
    expect(store().byId[id].archived).toBe(false)
    expect(store().undo).toBeNull()
  })

  it('offers an undo that restores a note moved to trash', async () => {
    const id = await store().createNote('text')
    await store().trashNote(id)
    expect(store().byId[id].deletedAt).toBeTypeOf('number')
    expect(store().undo?.message).toBe('Note moved to trash')

    await store().runUndo()
    expect(store().byId[id].deletedAt).toBeUndefined()
  })

  it('offers an undo that recreates a permanently deleted note', async () => {
    const id = await store().createNote('text', { title: 'gone' })
    await store().deleteForever(id)
    expect(store().byId[id]).toBeUndefined()
    expect(store().undo?.message).toBe('Note deleted')

    await store().runUndo()
    expect(store().byId[id]?.title).toBe('gone')
    // It should persist back to storage, not just memory.
    expect(await store().exportData()).toMatchObject({
      notes: expect.arrayContaining([expect.objectContaining({ id, title: 'gone' })]),
    })
  })

  it('does not offer undo for a silent discard (empty-note cleanup)', async () => {
    const id = await store().createNote('text')
    await store().deleteForever(id, { silent: true })
    expect(store().byId[id]).toBeUndefined()
    expect(store().undo).toBeNull()
  })

  it('rolls back the optimistic edit and surfaces the error when a write fails', async () => {
    const id = await store().createNote('text', { title: 'before' })
    const spy = vi
      .spyOn(getRepository(), 'updateNote')
      .mockRejectedValueOnce(new Error('disk full'))

    await store().updateNote(id, { title: 'after' })

    expect(store().byId[id].title).toBe('before')
    expect(store().lastError).toBe('disk full')
    spy.mockRestore()
  })

  it('reverses a bulk action and labels the count', async () => {
    const a = await store().createNote('text', { title: 'a' })
    const b = await store().createNote('text', { title: 'b' })

    await store().patchMany([a, b], { archived: true })
    expect(store().undo?.message).toBe('2 notes archived')

    await store().runUndo()
    expect(store().byId[a].archived).toBe(false)
    expect(store().byId[b].archived).toBe(false)
  })
})
