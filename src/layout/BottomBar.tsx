import { ListChecks, Pencil, Plus } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { useCreateNote } from '@/features/notes/useCreateNote'

/**
 * Mobile-only bottom bar. A prominent center FAB (new text note) flanked by a
 * checklist shortcut — thumb-reachable, with safe-area padding for the home bar.
 */
export function BottomBar() {
  const create = useCreateNote()

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="pointer-events-auto mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-[var(--app-surface)] px-2 py-1.5 shadow-lg ring-1 ring-[var(--app-border)]">
        <IconButton label="New checklist" onClick={() => create('checklist')}>
          <ListChecks size={22} />
        </IconButton>
        <button
          type="button"
          aria-label="New note"
          onClick={() => create('text')}
          className="grid h-14 w-14 place-items-center rounded-full bg-sky-400 text-[#202124] shadow-md transition-transform active:scale-95"
        >
          <Plus size={28} />
        </button>
        <IconButton label="New text note" onClick={() => create('text')}>
          <Pencil size={22} />
        </IconButton>
      </div>
    </div>
  )
}
