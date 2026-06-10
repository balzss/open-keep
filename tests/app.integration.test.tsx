import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore } from '@/store/useUiStore'

const store = () => useNotesStore.getState()

async function reset() {
  await store().init()
  await store().importData({ notes: [], tags: [] })
  useUiStore.setState({ view: 'active', activeTagId: null, search: '', editorNoteId: null })
}

describe('App integration', () => {
  beforeEach(reset)
  afterEach(cleanup)

  it('creates a text note via the composer and shows it in the grid', async () => {
    const user = userEvent.setup()
    render(<App />)

    // The sidebar's "New note" action creates a note and opens the editor.
    const nav = await screen.findByRole('navigation')
    await user.click(within(nav).getByRole('button', { name: 'New note' }))

    // Editor opens; type a title and body.
    const title = await screen.findByPlaceholderText('Title')
    await user.type(title, 'Shopping')
    await user.type(screen.getByPlaceholderText('Take a note…'), 'milk and eggs')

    // Close the editor (flushes autosave on unmount).
    await user.click(screen.getByRole('button', { name: 'Done' }))

    // The note now appears as a card in the grid.
    await waitFor(() => expect(screen.getByText('Shopping')).toBeInTheDocument())
    expect(screen.getByText('milk and eggs')).toBeInTheDocument()
  })

  it('keeps the editor open for a new note under StrictMode', async () => {
    // StrictMode double-invokes effects on mount; the editor's empty-note
    // discard must NOT fire on that probe and nuke the just-created note.
    const user = userEvent.setup()
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    const nav = await screen.findByRole('navigation')
    await user.click(within(nav).getByRole('button', { name: 'New note' }))

    // Editor stays open instead of closing immediately.
    expect(await screen.findByPlaceholderText('Title')).toBeInTheDocument()
  })

  it('persists notes across an app reload (re-mount)', async () => {
    // Seed a note directly, then mount the app fresh — it should hydrate it.
    const id = await store().createNote('text', { title: 'Persisted' })
    expect(id).toBeTruthy()

    render(<App />)
    await waitFor(() => expect(screen.getByText('Persisted')).toBeInTheDocument())
  })

  it('creates a checklist note with items', async () => {
    const id = await store().createNote('checklist', { title: 'Todo' })
    await store().updateNote(id, {
      items: [
        { id: 'i1', text: 'first task', checked: false, order: 'a0' },
        { id: 'i2', text: 'second task', checked: false, order: 'a1' },
      ],
    })

    render(<App />)
    const card = await screen.findByText('Todo')
    const grid = card.closest('[role="button"]') as HTMLElement
    expect(within(grid).getByText('first task')).toBeInTheDocument()
    expect(within(grid).getByText('second task')).toBeInTheDocument()
  })

  it('converts a text note to a checklist via the editor', async () => {
    const user = userEvent.setup()
    render(<App />)

    const nav = await screen.findByRole('navigation')
    await user.click(within(nav).getByRole('button', { name: 'New note' }))
    await user.type(await screen.findByPlaceholderText('Take a note…'), 'milk\neggs')

    // The body lines become checklist rows (one editable input each).
    await user.click(screen.getByRole('button', { name: 'Convert to checklist' }))
    expect(await screen.findByDisplayValue('milk')).toBeInTheDocument()
    expect(screen.getByDisplayValue('eggs')).toBeInTheDocument()
  })

  it('filters notes by search term', async () => {
    await store().createNote('text', { title: 'Apples' })
    await store().createNote('text', { title: 'Oranges' })

    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Apples')

    await user.type(screen.getByPlaceholderText('Search notes'), 'Apple')
    await waitFor(() => expect(screen.queryByText('Oranges')).not.toBeInTheDocument())
    expect(screen.getByText('Apples')).toBeInTheDocument()
  })
})
