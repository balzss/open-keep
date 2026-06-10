import { Check, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import type { ID } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useNote, useTags } from '@/store/selectors'
import { useNotesStore } from '@/store/useNotesStore'

/** Popover panel: toggle a note's labels and create new ones on the fly. */
export function TagPicker({ noteId }: { noteId: ID }) {
  const note = useNote(noteId)
  const tags = useTags()
  const toggleNoteTag = useNotesStore((s) => s.toggleNoteTag)
  const createTag = useNotesStore((s) => s.createTag)
  const [query, setQuery] = useState('')

  if (!note) return null
  const q = query.trim()
  const filtered = q ? tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())) : tags
  const exactExists = tags.some((t) => t.name.toLowerCase() === q.toLowerCase())

  const create = async () => {
    if (!q || exactExists) return
    const id = await createTag(q)
    await toggleNoteTag(noteId, id)
    setQuery('')
  }

  return (
    <div className="w-60">
      <p className="mb-2 font-medium text-[var(--app-text)] text-sm">Label note</p>
      <div className="mb-2 flex items-center gap-2 rounded-md bg-[var(--app-surface-2)] px-2 py-1.5">
        <Search size={16} className="shrink-0 text-[var(--app-text-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create()
          }}
          placeholder="Enter label name"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--app-text-muted)]"
        />
      </div>

      <ul className="max-h-48 overflow-y-auto">
        {filtered.map((tag) => {
          const on = note.tagIds.includes(tag.id)
          return (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => toggleNoteTag(noteId, tag.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span
                  className={cn(
                    'grid h-4 w-4 place-items-center rounded-sm ring-1 ring-[var(--app-border)]',
                    on && 'bg-blue-500 ring-blue-500',
                  )}
                >
                  {on && <Check size={12} className="text-white" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--app-text)]">{tag.name}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {q && !exactExists && (
        <button
          type="button"
          onClick={create}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-[var(--app-text)] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Plus size={16} className="text-[var(--app-text-muted)]" />
          Create “{q}”
        </button>
      )}
    </div>
  )
}
