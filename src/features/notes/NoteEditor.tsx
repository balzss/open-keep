import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckSquare,
  Info,
  RotateCcw,
  Tag as TagIcon,
  Trash2,
  Type,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AutoTextarea } from '@/components/AutoTextarea'
import { IconButton } from '@/components/IconButton'
import type { ChecklistItem, ID, NoteKind } from '@/domain/types'
import { TagPicker } from '@/features/tags/TagPicker'
import { useAutosave } from '@/hooks/useAutosave'
import { useBackDismiss } from '@/hooks/useBackDismiss'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import { byOrder, orderAtEnd } from '@/lib/order'
import { useNote, useTags } from '@/store/selectors'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore } from '@/store/useUiStore'
import { ChecklistEditor } from './ChecklistEditor'
import { NoteInfo } from './NoteInfo'

interface Draft {
  kind: NoteKind
  title: string
  body: string
  items: ChecklistItem[]
}

export function NoteEditor({ id }: { id: ID }) {
  const note = useNote(id)
  const isDesktop = useIsDesktop()
  const closeEditor = useUiStore((s) => s.closeEditor)
  const updateNote = useNotesStore((s) => s.updateNote)
  const setArchived = useNotesStore((s) => s.setArchived)
  const trashNote = useNotesStore((s) => s.trashNote)
  const restoreNote = useNotesStore((s) => s.restoreNote)
  const deleteForever = useNotesStore((s) => s.deleteForever)
  const toggleNoteTag = useNotesStore((s) => s.toggleNoteTag)

  const [draft, setDraft] = useState<Draft>(() => ({
    kind: note?.kind ?? 'text',
    title: note?.title ?? '',
    body: note?.body ?? '',
    items: note?.items ?? [],
  }))
  const [showTags, setShowTags] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const allTags = useTags()

  useAutosave(draft, (d) => updateNote(id, d))

  // Discard a note that's empty when the editor closes (matches Keep). This
  // unmount cleanup runs before the autosave flush, so the delete wins.
  const draftRef = useRef(draft)
  draftRef.current = draft
  useEffect(() => {
    return () => {
      // Only discard on a *real* close. StrictMode double-invokes this cleanup
      // on mount in dev; there editorNoteId still points here, so we skip and
      // avoid nuking a freshly created note before the user can type.
      if (useUiStore.getState().editorNoteId === id) return
      const d = draftRef.current
      const empty = !d.title.trim() && !d.body.trim() && !d.items.some((i) => i.text.trim())
      // Cleanup discard, not a user action — don't offer to "undo" it.
      if (empty) deleteForever(id, { silent: true })
    }
  }, [id, deleteForever])

  // Close if the note vanished (e.g. permanently deleted elsewhere).
  useEffect(() => {
    if (!note) closeEditor()
  }, [note, closeEditor])

  useEscapeKey(
    showTags ? () => setShowTags(false) : showInfo ? () => setShowInfo(false) : closeEditor,
  )
  useBackDismiss(true, closeEditor)
  useBackDismiss(showTags, () => setShowTags(false))
  useBackDismiss(showInfo, () => setShowInfo(false))

  if (!note) return null

  const trashed = note.deletedAt != null

  const toggleKind = () =>
    setDraft((d) => {
      if (d.kind === 'text') {
        const lines = d.body
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        let last: string | null = null
        const items = lines.map((text) => {
          last = orderAtEnd(last)
          return { id: newId(), text, checked: false, order: last }
        })
        return { ...d, kind: 'checklist', items, body: '' }
      }
      const body = [...d.items]
        .sort(byOrder)
        .map((i) => i.text)
        .join('\n')
      return { ...d, kind: 'text', body, items: [] }
    })

  const after = (fn: () => void) => () => {
    fn()
    closeEditor()
  }

  // Desktop: anchor near the top (not center) so content height changes — e.g. a
  // checklist row collapsing — grow downward instead of re-centering and making
  // the whole modal jump.
  return (
    <div className="fixed inset-0 z-50 flex md:items-start md:justify-center md:py-[8vh]">
      <button
        type="button"
        aria-label="Close editor"
        onClick={closeEditor}
        className="absolute inset-0 cursor-default bg-black/40 md:bg-black/50"
      />
      <div
        className={cn(
          'relative z-10 flex w-full flex-col bg-[var(--app-bg)] shadow-2xl',
          'h-full md:h-auto md:max-h-[84vh] md:w-[min(92vw,40rem)] md:rounded-xl',
          'ring-1 ring-[var(--app-border)]',
        )}
      >
        {/* Mobile back bar (desktop closes via Done / Esc / backdrop). */}
        {!isDesktop && (
          <div className="pt-safe flex items-center gap-1 px-2 py-2">
            <IconButton label="Back" onClick={closeEditor}>
              <ArrowLeft size={22} />
            </IconButton>
          </div>
        )}

        {/* Scrollable content (extra top padding on desktop, which has no back bar) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:pt-4">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title"
            autoComplete="off"
            className="mb-2 w-full bg-transparent py-1 font-medium text-[var(--app-text)] text-lg outline-none placeholder:text-[var(--app-text-muted)]"
          />
          {draft.kind === 'text' ? (
            <AutoTextarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              placeholder="Take a note…"
              className="py-1 text-[15px] text-[var(--app-text)] leading-relaxed placeholder:text-[var(--app-text-muted)]"
              autoFocus={!draft.title && !draft.body}
            />
          ) : (
            <ChecklistEditor
              items={draft.items}
              onChange={(items) => setDraft((d) => ({ ...d, items }))}
            />
          )}

          {note.tagIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {note.tagIds.map((tagId) => {
                const tag = allTags.find((t) => t.id === tagId)
                if (!tag) return null
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleNoteTag(id, tag.id)}
                    className="group/chip flex items-center gap-1 rounded-md bg-black/5 px-2.5 py-1 text-[var(--app-text-muted)] text-xs dark:bg-white/10"
                  >
                    {tag.name}
                    <span className="opacity-50 group-hover/chip:opacity-100">×</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Tag popover */}
        {showTags && (
          <div
            role="dialog"
            aria-label="Labels"
            onBlur={(e) => {
              // Close when focus leaves the popover entirely. relatedTarget is
              // the element receiving focus; null means it went to body (click
              // outside / tap on non-focusable area).
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setShowTags(false)
              }
            }}
            className="mx-2 mb-1 rounded-lg bg-[var(--app-surface)] p-3 shadow-lg ring-1 ring-[var(--app-border)]"
          >
            <TagPicker noteId={id} />
          </div>
        )}

        {/* Info popover */}
        {showInfo && (
          <div
            role="dialog"
            aria-label="Note info"
            tabIndex={-1}
            ref={(el) => el?.focus()}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setShowInfo(false)
              }
            }}
            className="mx-2 mb-1 rounded-lg bg-[var(--app-surface)] p-3 shadow-lg outline-none ring-1 ring-[var(--app-border)]"
          >
            <NoteInfo noteId={id} />
          </div>
        )}

        {/* Action bar. Fold the mobile safe-area inset into the bottom padding
            rather than using .pb-safe, which (defined after Tailwind) would win
            over md:pb-3 and leave the desktop card with no bottom padding. */}
        <div className="flex items-center gap-2 px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.375rem)] md:pb-3">
          <div className="flex-1" />
          {trashed ? (
            <>
              <IconButton label="Restore" size="sm" onClick={after(() => restoreNote(id))}>
                <RotateCcw size={20} />
              </IconButton>
              <IconButton label="Delete forever" size="sm" onClick={after(() => deleteForever(id))}>
                <Trash2 size={20} />
              </IconButton>
              <IconButton
                label="Note info"
                size="sm"
                active={showInfo}
                onClick={() => setShowInfo((v) => !v)}
              >
                <Info size={20} />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton
                label={draft.kind === 'text' ? 'Convert to checklist' : 'Convert to text'}
                size="sm"
                onClick={toggleKind}
              >
                {draft.kind === 'text' ? <CheckSquare size={20} /> : <Type size={20} />}
              </IconButton>
              <IconButton
                label="Labels"
                size="sm"
                active={showTags}
                onClick={() => {
                  setShowTags((v) => !v)
                }}
              >
                <TagIcon size={20} />
              </IconButton>
              <IconButton
                label={note.archived ? 'Unarchive' : 'Archive'}
                size="sm"
                onClick={after(() => setArchived(id, !note.archived))}
              >
                {note.archived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
              </IconButton>
              <IconButton label="Move to trash" size="sm" onClick={after(() => trashNote(id))}>
                <Trash2 size={20} />
              </IconButton>
              <IconButton
                label="Note info"
                size="sm"
                active={showInfo}
                onClick={() => setShowInfo((v) => !v)}
              >
                <Info size={20} />
              </IconButton>
            </>
          )}
          <button
            type="button"
            onClick={closeEditor}
            className="rounded-lg px-4 py-2 font-medium text-[var(--app-text)] text-sm hover:bg-black/10 dark:hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
