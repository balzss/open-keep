import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChecklistItem } from '@/domain/types'
import { ChecklistEditor } from '@/features/notes/ChecklistEditor'

afterEach(cleanup)

const item = (over: Partial<ChecklistItem> = {}): ChecklistItem => ({
  id: 'a',
  text: 'milk',
  checked: false,
  order: 'a0',
  ...over,
})

/** Stateful host so onChange actually feeds items back in, like the real parent. */
function Host({ initial }: { initial: ChecklistItem[] }) {
  const [items, setItems] = useState(initial)
  return <ChecklistEditor items={items} onChange={setItems} />
}

describe('ChecklistEditor', () => {
  it('seeds and focuses a real item for a brand-new (empty) list', () => {
    render(<Host initial={[]} />)
    // An empty list opens with exactly one blank item, and it holds focus.
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toHaveValue('')
    expect(inputs[0]).toHaveFocus()
  })

  it('does not seed or steal focus when opening a list that already has items', () => {
    render(<Host initial={[item()]} />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).not.toHaveFocus()
  })

  it('appends a blank item when the add button is clicked', () => {
    const onChange = vi.fn()
    render(<ChecklistEditor items={[item()]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'List item' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as ChecklistItem[]
    expect(next).toHaveLength(2)
    expect(next[1]).toMatchObject({ text: '', checked: false })
  })

  it('backspace in an empty item removes it and focuses the previous one', () => {
    render(
      <Host
        initial={[
          item({ id: 'a', text: 'milk', order: 'a0' }),
          item({ id: 'b', text: '', order: 'a1' }),
        ]}
      />,
    )
    const [first, second] = screen.getAllByRole('textbox')
    fireEvent.keyDown(second, { key: 'Backspace' })

    const remaining = screen.getAllByRole('textbox')
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toHaveValue('milk')
    expect(remaining[0]).toBe(first)
    expect(first).toHaveFocus()
  })

  it('enter in the middle of an item splits it at the caret', () => {
    render(<Host initial={[item({ id: 'a', text: 'milkeggs', order: 'a0' })]} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(4, 4)
    fireEvent.keyDown(textarea, { key: 'Enter' })

    const rows = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(rows.map((r) => r.value)).toEqual(['milk', 'eggs'])
    // The tail moves to the new row, which is focused with the caret at its start.
    expect(rows[1]).toHaveFocus()
    expect(rows[1].selectionStart).toBe(0)
  })

  it('backspace at the start of a non-empty item merges it into the previous one', () => {
    render(
      <Host
        initial={[
          item({ id: 'a', text: 'milk', order: 'a0' }),
          item({ id: 'b', text: 'eggs', order: 'a1' }),
        ]}
      />,
    )
    const second = screen.getAllByRole('textbox')[1] as HTMLTextAreaElement
    second.setSelectionRange(0, 0)
    fireEvent.keyDown(second, { key: 'Backspace' })

    const rows = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe('milkeggs')
    // Caret rests at the junction (end of the original previous text).
    expect(rows[0]).toHaveFocus()
    expect(rows[0].selectionStart).toBe(4)
  })

  it('backspace in the middle of an item deletes a character normally', () => {
    const onChange = vi.fn()
    render(<ChecklistEditor items={[item({ id: 'a', text: 'milk' })]} onChange={onChange} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(2, 2)
    fireEvent.keyDown(textarea, { key: 'Backspace' })
    // Not intercepted: the browser handles the deletion, no merge fires.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('backspace in an empty first item is a no-op (nothing above it)', () => {
    const onChange = vi.fn()
    render(<ChecklistEditor items={[item({ text: '' })]} onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Backspace' })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('lines the add button up with the item control columns', () => {
    render(<ChecklistEditor items={[item()]} onChange={() => {}} />)
    const grip = screen.getByRole('button', { name: 'Drag to reorder' })
    const checkbox = screen.getByRole('button', { name: 'Mark complete' })
    const addButton = screen.getByRole('button', { name: 'List item' })
    const [spacer, plus] = addButton.querySelectorAll('span')

    // Add-row leading spacer matches the grip column width...
    expect(grip.className).toContain('w-8')
    expect(spacer.className).toContain('w-8')
    // ...and the plus sits in a column matching the checkbox, so inputs line up.
    expect(checkbox.className).toContain('w-9')
    expect(plus.className).toContain('w-9')
  })
})
