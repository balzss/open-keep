import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Circle,
  RotateCcw,
  Square,
  SquareCheckBig,
  Trash2,
} from 'lucide-react'
import { memo } from 'react'
import { IconButton } from '@/components/IconButton'
import type { Note } from '@/domain/types'
import { cn } from '@/lib/cn'
import { byOrder } from '@/lib/order'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore, type View } from '@/store/useUiStore'

interface NoteCardProps {
  note: Note
  view: View
}

const PREVIEW_ITEMS = 6

// Hidden until the card is hovered/focused; always shown on touch (no hover).
const REVEAL_ON_HOVER =
  'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100'

/** Wraps a handler so clicking a card action doesn't also trigger the card. */
function stop(fn: () => void) {
  return (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    fn()
  }
}

function NoteCardImpl({ note, view }: NoteCardProps) {
  const openEditor = useUiStore((s) => s.openEditor)
  const toggleSelected = useUiStore((s) => s.toggleSelected)
  const selected = useUiStore((s) => s.selection.has(note.id))
  const selectionMode = useUiStore((s) => s.selection.size > 0)
  const tagsMap = useNotesStore((s) => s.tags)
  const setArchived = useNotesStore((s) => s.setArchived)
  const trashNote = useNotesStore((s) => s.trashNote)
  const restoreNote = useNotesStore((s) => s.restoreNote)
  const deleteForever = useNotesStore((s) => s.deleteForever)

  const sortedItems = note.kind === 'checklist' ? [...note.items].sort(byOrder) : []
  // Unchecked items first, then checked, capped at the preview limit.
  const previewItems = [
    ...sortedItems.filter((i) => !i.checked),
    ...sortedItems.filter((i) => i.checked),
  ].slice(0, PREVIEW_ITEMS)
  const tagNames = note.tagIds.map((id) => tagsMap[id]?.name).filter(Boolean) as string[]

  // In selection mode the whole card toggles selection; otherwise it opens.
  const activate = () => (selectionMode ? toggleSelected(note.id) : openEditor(note.id))

  return (
    <div
      className={cn(
        'group relative w-full cursor-pointer break-inside-avoid rounded-xl bg-[var(--app-surface)] p-4 text-left transition-shadow hover:shadow-md',
        selected ? 'ring-2 ring-sky-500' : 'ring-1 ring-[var(--app-border)]',
      )}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter') activate()
      }}
      role="button"
      tabIndex={0}
    >
      {/* Selection checkbox — entry point into bulk mode. */}
      <div
        className={cn(
          'absolute top-2 right-2 transition-opacity',
          selectionMode || selected ? 'opacity-100' : REVEAL_ON_HOVER,
        )}
      >
        <IconButton
          label={selected ? 'Deselect note' : 'Select note'}
          size="sm"
          onClick={stop(() => toggleSelected(note.id))}
        >
          {selected ? <CheckCircle2 size={20} className="text-sky-500" /> : <Circle size={20} />}
        </IconButton>
      </div>

      {note.title && (
        <h3 className="mb-2 pr-8 font-medium text-[var(--app-text)] leading-snug">{note.title}</h3>
      )}

      {note.kind === 'text' && note.body && (
        <p className="whitespace-pre-wrap break-words text-[15px] text-[var(--app-text)]/90 leading-snug line-clamp-[12]">
          {note.body}
        </p>
      )}

      {note.kind === 'checklist' && (
        <ul className="space-y-1 text-[15px] text-[var(--app-text)]/90">
          {previewItems.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              {item.checked ? (
                <SquareCheckBig size={16} className="mt-0.5 shrink-0 opacity-60" />
              ) : (
                <Square size={16} className="mt-0.5 shrink-0 opacity-60" />
              )}
              <span className={cn('break-words', item.checked && 'line-through opacity-60')}>
                {item.text || ' '}
              </span>
            </li>
          ))}
          {sortedItems.length > PREVIEW_ITEMS && (
            <li className="text-[var(--app-text-muted)] text-sm">
              + {sortedItems.length - PREVIEW_ITEMS} more
            </li>
          )}
        </ul>
      )}

      {tagNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tagNames.map((name) => (
            <span
              key={name}
              className="rounded-md bg-black/5 px-2 py-0.5 text-[var(--app-text-muted)] text-xs dark:bg-white/10"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/*
       * Per-card quick actions. Hidden (but kept in layout, so the card never
       * resizes) while selecting — the bulk bar handles actions then.
       */}
      <div
        className={cn(
          'mt-2 flex justify-end gap-2 transition-opacity -mb-2 -mr-2',
          selectionMode ? 'invisible' : REVEAL_ON_HOVER,
        )}
      >
        {view === 'trash' ? (
          <>
            <IconButton label="Restore" size="sm" onClick={stop(() => restoreNote(note.id))}>
              <RotateCcw size={18} />
            </IconButton>
            <IconButton
              label="Delete forever"
              size="sm"
              onClick={stop(() => deleteForever(note.id))}
            >
              <Trash2 size={18} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              label={note.archived ? 'Unarchive' : 'Archive'}
              size="sm"
              onClick={stop(() => setArchived(note.id, !note.archived))}
            >
              {note.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
            </IconButton>
            <IconButton label="Move to trash" size="sm" onClick={stop(() => trashNote(note.id))}>
              <Trash2 size={18} />
            </IconButton>
          </>
        )}
      </div>
    </div>
  )
}

export const NoteCard = memo(NoteCardImpl)
