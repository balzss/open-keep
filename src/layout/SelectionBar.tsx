import { Archive, ArchiveRestore, RotateCcw, Trash2, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { IconButton } from '@/components/IconButton'
import type { ID } from '@/domain/types'
import { now } from '@/lib/clock'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore, type View } from '@/store/useUiStore'

interface BulkAction {
  label: string
  icon: ComponentType<{ size?: number }>
  run: (ids: ID[]) => void
}

/** Contextual top bar shown while notes are selected (bulk mode). */
export function SelectionBar() {
  const selection = useUiStore((s) => s.selection)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const view = useUiStore((s) => s.view)
  const patchMany = useNotesStore((s) => s.patchMany)
  const removeMany = useNotesStore((s) => s.removeMany)

  const ids = [...selection]

  // Available bulk actions depend on which list is being viewed.
  const moveToTrash: BulkAction = {
    label: 'Move to trash',
    icon: Trash2,
    run: (x) => patchMany(x, { deletedAt: now() }),
  }
  const actionsByView: Record<View, BulkAction[]> = {
    trash: [
      { label: 'Restore', icon: RotateCcw, run: (x) => patchMany(x, { deletedAt: undefined }) },
      { label: 'Delete forever', icon: Trash2, run: (x) => removeMany(x) },
    ],
    archive: [
      { label: 'Unarchive', icon: ArchiveRestore, run: (x) => patchMany(x, { archived: false }) },
      moveToTrash,
    ],
    active: [
      { label: 'Archive', icon: Archive, run: (x) => patchMany(x, { archived: true }) },
      moveToTrash,
    ],
  }
  const actions = actionsByView[view]

  const runAction = (action: BulkAction) => {
    action.run(ids)
    clearSelection()
  }

  return (
    <header className="pt-safe sticky top-0 z-30 bg-[var(--app-bg)]">
      <div className="flex items-center gap-2 px-2 py-2 md:px-4">
        <IconButton label="Clear selection" onClick={clearSelection}>
          <X size={22} />
        </IconButton>
        <span className="flex-1 font-medium text-[var(--app-text)]">{ids.length} selected</span>
        {actions.map((action) => (
          <IconButton key={action.label} label={action.label} onClick={() => runAction(action)}>
            <action.icon size={20} />
          </IconButton>
        ))}
      </div>
    </header>
  )
}
