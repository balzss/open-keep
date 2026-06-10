import { useVisibleNotes } from '@/store/selectors'
import { useNotesStore } from '@/store/useNotesStore'

/** Shown atop the trash view: explains retention and offers a bulk purge. */
export function TrashBar() {
  const notes = useVisibleNotes()
  const emptyTrash = useNotesStore((s) => s.emptyTrash)

  if (notes.length === 0) return null

  return (
    <div className="mx-auto mb-4 flex w-full max-w-5xl items-center justify-between gap-3 px-1 text-[var(--app-text-muted)] text-sm">
      <span>Notes in trash can be restored or deleted forever.</span>
      <button
        type="button"
        onClick={() => emptyTrash()}
        className="shrink-0 rounded-md px-2 py-1 font-medium text-red-500 hover:bg-red-500/10"
      >
        Empty trash
      </button>
    </div>
  )
}
