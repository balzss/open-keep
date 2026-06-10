import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Archive, NotebookPen, Search, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ID, Note } from '@/domain/types'
import { useColumnCount } from '@/hooks/useColumnCount'
import { useVisibleNotes } from '@/store/selectors'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore, type View } from '@/store/useUiStore'
import { NoteCard } from './NoteCard'

/** Round-robin distribution into N columns: item i → column i % n. */
function toColumns(notes: Note[], columns: number): Note[][] {
  const cols: Note[][] = Array.from({ length: columns }, () => [])
  notes.forEach((note, i) => {
    cols[i % columns].push(note)
  })
  return cols
}

function SortableCard({ note, view, draggable }: { note: Note; view: View; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: !draggable,
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <NoteCard note={note} view={view} />
    </div>
  )
}

function Section({
  notes,
  columns,
  view,
  draggable,
  onReorder,
}: {
  notes: Note[]
  columns: number
  view: View
  draggable: boolean
  onReorder: (id: ID, orderedIds: ID[]) => void
}) {
  const sensors = useSensors(
    // Desktop: small drag threshold so a plain click still opens the note.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch: long-press to drag so vertical scrolling keeps working.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (notes.length === 0) return null
  const ids = notes.map((n) => n.id)
  const cols = toColumns(notes, columns)

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(active.id as ID)
    const to = ids.indexOf(over.id as ID)
    if (from === -1 || to === -1) return
    onReorder(active.id as ID, arrayMove(ids, from, to))
  }

  const grid = (
    <div className="flex items-start gap-3">
      {cols.map((col, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: columns are fixed positions, not reorderable
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
          {col.map((note) => (
            <SortableCard key={note.id} note={note} view={view} draggable={draggable} />
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <section className="mb-4">
      {draggable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {grid}
          </SortableContext>
        </DndContext>
      ) : (
        grid
      )}
    </section>
  )
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-[var(--app-text-muted)]">
      <div className="opacity-40">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  )
}

export function NoteGrid() {
  const columns = useColumnCount()
  const notes = useVisibleNotes()
  const view = useUiStore((s) => s.view)
  const search = useUiStore((s) => s.search)
  const selectionMode = useUiStore((s) => s.selection.size > 0)
  const reorderNote = useNotesStore((s) => s.reorderNote)

  if (notes.length === 0) {
    if (search.trim()) {
      return <EmptyState icon={<Search size={64} />} text={`No notes match “${search.trim()}”`} />
    }
    if (view === 'archive') {
      return <EmptyState icon={<Archive size={64} />} text="Archived notes appear here" />
    }
    if (view === 'trash') {
      return <EmptyState icon={<Trash2 size={64} />} text="Trash is empty" />
    }
    return <EmptyState icon={<NotebookPen size={64} />} text="Notes you add appear here" />
  }

  // Dragging reorders only in the active view, with no search filter or selection.
  const draggable = view === 'active' && !search.trim() && !selectionMode

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Section
        notes={notes}
        columns={columns}
        view={view}
        draggable={draggable}
        onReorder={reorderNote}
      />
    </div>
  )
}
