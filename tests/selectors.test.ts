import { describe, expect, it } from 'vitest'
import type { ID, Note } from '@/domain/types'
import { visibleNotes } from '@/store/selectors'

let seq = 0
function makeNote(over: Partial<Note> = {}): Note {
  seq += 1
  return {
    id: `n${seq}`,
    kind: 'text',
    // Default to a note with content; content-empty notes are filtered from the
    // grid (see the dedicated tests below), so view/tag/sort tests give a title.
    title: `note ${seq}`,
    body: '',
    items: [],
    tagIds: [],
    archived: false,
    order: `a${seq}`,
    createdAt: seq,
    updatedAt: seq,
    ...over,
  }
}

function byId(...notes: Note[]): Record<ID, Note> {
  return Object.fromEntries(notes.map((n) => [n.id, n]))
}

describe('visibleNotes', () => {
  it('active view shows only live, non-archived notes', () => {
    const live = makeNote({ title: 'live' })
    const archived = makeNote({ title: 'archived', archived: true })
    const trashed = makeNote({ title: 'trashed', deletedAt: 1 })
    const notes = visibleNotes(byId(live, archived, trashed), {
      view: 'active',
      activeTagId: null,
      search: '',
    })
    expect(notes.map((n) => n.id)).toEqual([live.id])
  })

  it('hides content-empty notes (a note being authored) from the grid', () => {
    const withContent = makeNote({ title: 'real' })
    const blank = makeNote({ title: '', body: '', items: [] })
    // A freshly seeded checklist has one blank row — still no real content.
    const seeded = makeNote({
      kind: 'checklist',
      title: '',
      items: [{ id: 'i', text: '', checked: false, order: 'a0' }],
    })
    const notes = visibleNotes(byId(withContent, blank, seeded), {
      view: 'active',
      activeTagId: null,
      search: '',
    })
    expect(notes.map((n) => n.id)).toEqual([withContent.id])
  })

  it('shows a note once it gains content (title, body, or a non-blank item)', () => {
    const byTitle = makeNote({ title: 'has title', body: '', items: [] })
    const byBody = makeNote({ title: '', body: 'has body', items: [] })
    const byItem = makeNote({
      kind: 'checklist',
      title: '',
      items: [{ id: 'i', text: 'a task', checked: false, order: 'a0' }],
    })
    const notes = visibleNotes(byId(byTitle, byBody, byItem), {
      view: 'active',
      activeTagId: null,
      search: '',
    })
    expect(notes.map((n) => n.id).sort()).toEqual([byBody.id, byItem.id, byTitle.id].sort())
  })

  it('archive view shows only archived (non-trashed) notes', () => {
    const archived = makeNote({ archived: true })
    const archivedTrashed = makeNote({ archived: true, deletedAt: 1 })
    const notes = visibleNotes(byId(archived, archivedTrashed, makeNote()), {
      view: 'archive',
      activeTagId: null,
      search: '',
    })
    expect(notes.map((n) => n.id)).toEqual([archived.id])
  })

  it('trash view shows only trashed notes', () => {
    const trashed = makeNote({ deletedAt: 1 })
    const notes = visibleNotes(byId(trashed, makeNote()), {
      view: 'trash',
      activeTagId: null,
      search: '',
    })
    expect(notes.map((n) => n.id)).toEqual([trashed.id])
  })

  it('filters the active view by tag', () => {
    const tagged = makeNote({ tagIds: ['t1'] })
    const notes = visibleNotes(byId(tagged, makeNote()), {
      view: 'active',
      activeTagId: 't1',
      search: '',
    })
    expect(notes.map((n) => n.id)).toEqual([tagged.id])
  })

  it('searches title, body, and checklist items (case-insensitive)', () => {
    const byTitle = makeNote({ title: 'Milk run' })
    const byBody = makeNote({ body: 'remember the milk' })
    const byItem = makeNote({
      kind: 'checklist',
      items: [{ id: 'i', text: 'buy MILK', checked: false, order: 'a0' }],
    })
    const miss = makeNote({ title: 'eggs' })
    const notes = visibleNotes(byId(byTitle, byBody, byItem, miss), {
      view: 'active',
      activeTagId: null,
      search: 'milk',
    })
    expect(notes.map((n) => n.id).sort()).toEqual([byBody.id, byItem.id, byTitle.id].sort())
  })

  it('sorts by manual order, then newest-updated as a tiebreak', () => {
    const a = makeNote({ order: 'a0', updatedAt: 1 })
    const b = makeNote({ order: 'a1', updatedAt: 5 })
    const tie1 = makeNote({ order: 'a2', updatedAt: 10 })
    const tie2 = makeNote({ order: 'a2', updatedAt: 20 })
    const notes = visibleNotes(byId(b, tie1, a, tie2), {
      view: 'active',
      activeTagId: null,
      search: '',
    })
    expect(notes.map((n) => n.id)).toEqual([a.id, b.id, tie2.id, tie1.id])
  })
})
