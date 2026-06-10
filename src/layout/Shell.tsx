import { lazy, Suspense } from 'react'
import { Toast } from '@/components/Toast'
import { NoteEditor } from '@/features/notes/NoteEditor'
import { NoteGrid } from '@/features/notes/NoteGrid'
import { TrashBar } from '@/features/notes/TrashBar'
import { useUiStore } from '@/store/useUiStore'
import { AppBar } from './AppBar'
import { BottomBar } from './BottomBar'
import { Drawer } from './Drawer'
import { SelectionBar } from './SelectionBar'

// The editor is the core interaction — keep it eager so it opens with no gap.
// The rarely-used tag manager and settings stay lazy (off the initial bundle).
const TagManager = lazy(() =>
  import('@/features/tags/TagManager').then((m) => ({ default: m.TagManager })),
)
const Settings = lazy(() =>
  import('@/features/settings/Settings').then((m) => ({ default: m.Settings })),
)

export function Shell() {
  const editorNoteId = useUiStore((s) => s.editorNoteId)
  const tagManagerOpen = useUiStore((s) => s.tagManagerOpen)
  const settingsOpen = useUiStore((s) => s.settingsOpen)
  const view = useUiStore((s) => s.view)
  const selectionMode = useUiStore((s) => s.selection.size > 0)

  return (
    // Sidebar is a full-height column on the left so its border runs to the very
    // top; the app bar lives in the content column to its right.
    <div className="flex h-full">
      <Drawer />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selectionMode ? <SelectionBar /> : <AppBar />}
        <main className="min-w-0 flex-1 overflow-y-auto px-3 pt-2 pb-28 md:px-6 md:pb-10">
          {view === 'trash' && <TrashBar />}
          <NoteGrid />
        </main>
      </div>

      <BottomBar />
      <Toast />

      {editorNoteId && <NoteEditor key={editorNoteId} id={editorNoteId} />}

      {tagManagerOpen && (
        <Suspense fallback={null}>
          <TagManager />
        </Suspense>
      )}

      {settingsOpen && (
        <Suspense fallback={null}>
          <Settings />
        </Suspense>
      )}
    </div>
  )
}
