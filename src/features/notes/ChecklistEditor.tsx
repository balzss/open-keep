import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Square,
  SquareCheckBig,
  X,
} from 'lucide-react'
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AutoTextarea } from '@/components/AutoTextarea'
import { IconButton } from '@/components/IconButton'
import type { ChecklistItem, ID } from '@/domain/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import { byOrder, orderAtEnd, orderBetween } from '@/lib/order'

/** Collapse animation duration; mirrored by the JS finalize timer below. */
const EXIT_MS = 190

interface Props {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
}

interface RowHandlers {
  onToggle: (id: ID) => void
  onText: (id: ID, text: string) => void
  onRemove: (id: ID) => void
  // Enter splits the row at the caret: text before stays, text after [start,end)
  // becomes a new row below, which takes focus at its start.
  onEnter: (id: ID, start: number, end: number) => void
  // Backspace at the start of a row merges it into the previous row (appending
  // its text) and focuses the junction. Returns whether it acted (so the row can
  // swallow the keystroke), false when there's nothing above.
  onBackspace: (id: ID) => boolean
}

/**
 * Presentational row body shared by sortable and static rows.
 * `visualChecked` may differ from `item.checked` mid-animation: when a row is
 * collapsing out after a toggle, it shows its *target* checked state (so the
 * strikethrough/fill animate in place before it relocates).
 */
function RowBody({
  item,
  visualChecked,
  autoFocus,
  caret,
  onToggle,
  onText,
  onRemove,
  onEnter,
  onBackspace,
}: {
  item: ChecklistItem
  visualChecked: boolean
  autoFocus?: boolean
  caret?: number | 'end'
} & RowHandlers) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // A row flagged for focus (after a split/merge/append) grabs it and places the
  // caret where the edit left off — the end by default, or a specific offset.
  useLayoutEffect(() => {
    if (!autoFocus) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    const pos =
      caret === undefined || caret === 'end' ? el.value.length : Math.min(caret, el.value.length)
    el.setSelectionRange(pos, pos)
  }, [autoFocus, caret])
  return (
    <>
      <button
        type="button"
        aria-label={visualChecked ? 'Mark incomplete' : 'Mark complete'}
        onClick={() => onToggle(item.id)}
        className="mr-1 flex h-11 w-9 shrink-0 items-center justify-start text-[var(--app-text-muted)] md:h-8 md:w-6"
      >
        {visualChecked ? (
          <SquareCheckBig className="size-[26px] md:size-[22px]" />
        ) : (
          <Square className="size-[26px] md:size-[22px]" />
        )}
      </button>
      <AutoTextarea
        ref={inputRef}
        value={item.text}
        onChange={(e) => onText(item.id, e.target.value)}
        onKeyDown={(e) => {
          const el = e.currentTarget
          // Enter splits at the caret instead of inserting a newline, so each
          // item stays a single logical line that wraps when it's long.
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter(item.id, el.selectionStart ?? 0, el.selectionEnd ?? 0)
          } else if (e.key === 'Backspace') {
            // Only at the very start, with no selection: merge into the row above.
            if (el.selectionStart === 0 && el.selectionEnd === 0 && onBackspace(item.id)) {
              e.preventDefault()
            }
          }
        }}
        className={cn(
          'min-w-0 flex-1 py-2.5 text-[15px] leading-snug transition-[color,opacity] duration-200 md:py-1',
          visualChecked && 'text-[var(--app-text-muted)] line-through opacity-70',
        )}
      />
      <IconButton
        label="Delete item"
        size="sm"
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover/item:opacity-100 max-md:opacity-100"
      >
        <X size={16} />
      </IconButton>
    </>
  )
}

/** Wraps row contents in the grid-rows collapse container used for exit animation. */
function collapseStyle(collapsing: boolean, extra?: string): CSSProperties {
  return {
    gridTemplateRows: collapsing ? '0fr' : '1fr',
    opacity: collapsing ? 0 : undefined,
    transition: [extra, `grid-template-rows ${EXIT_MS}ms ease`, `opacity ${EXIT_MS}ms ease`]
      .filter(Boolean)
      .join(', '),
  }
}

interface RowProps {
  item: ChecklistItem
  collapsing: boolean
  visualChecked: boolean
  autoFocus?: boolean
  caret?: number | 'end'
}

/** Unchecked item: draggable via the grip handle (handle-only so typing/scroll work). */
function SortableRow({
  item,
  collapsing,
  visualChecked,
  autoFocus,
  caret,
  ...handlers
}: RowProps & RowHandlers) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })
  const style: CSSProperties = {
    // dnd manages transform (and its transition); we add the collapse transitions.
    // Zero the x component so dragging only moves the row vertically.
    transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null),
    ...collapseStyle(collapsing, transition),
    opacity: isDragging ? 0.5 : collapsing ? 0 : undefined,
  }
  return (
    <li ref={setNodeRef} style={style} className="grid" {...attributes}>
      <div className="group/item flex min-h-0 items-start gap-2 overflow-hidden md:gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label="Drag to reorder"
          className="-ml-1 flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--app-text-muted)] opacity-0 group-hover/item:opacity-60 max-md:opacity-60 md:h-8 md:w-5"
          {...listeners}
        >
          <GripVertical className="size-6 md:size-5" />
        </button>
        <RowBody
          item={item}
          visualChecked={visualChecked}
          autoFocus={autoFocus}
          caret={caret}
          {...handlers}
        />
      </div>
    </li>
  )
}

/** Checked item: not reorderable; aligned with a spacer where the grip would be. */
function StaticRow({
  item,
  collapsing,
  visualChecked,
  autoFocus,
  caret,
  ...handlers
}: RowProps & RowHandlers) {
  return (
    <li className="grid" style={collapseStyle(collapsing)}>
      <div className="group/item flex min-h-0 items-start gap-2 overflow-hidden md:gap-1">
        <span className="-ml-1 w-8 shrink-0 md:w-5" aria-hidden />
        <RowBody
          item={item}
          visualChecked={visualChecked}
          autoFocus={autoFocus}
          caret={caret}
          {...handlers}
        />
      </div>
    </li>
  )
}

/** Controlled checklist editor. All edits flow up via onChange; the parent autosaves. */
export function ChecklistEditor({ items, onChange }: Props) {
  const [showChecked, setShowChecked] = useState(true)
  // Rows mid-exit-animation: id → 'remove', or the target checked state for a
  // toggle. The row shows that target state and collapses out before the change
  // commits (dropping a removed row, relocating a toggled one).
  const [pending, setPending] = useState<ReadonlyMap<ID, 'remove' | boolean>>(() => new Map())
  // Row to focus once it renders, and where to put the caret — set after a
  // split / merge / append so focus follows the edit into the right row.
  const [focusTarget, setFocusTarget] = useState<{ id: ID; caret: number | 'end' } | null>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // Latest items for the delayed finalize, and timers to clear on unmount.
  const itemsRef = useRef(items)
  itemsRef.current = items
  const timers = useRef(new Map<ID, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  const sensors = useSensors(
    // Handle is small with touch-action:none, so a tiny threshold is enough.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sorted = [...items].sort(byOrder)
  const unchecked = sorted.filter((i) => !i.checked)
  const checked = sorted.filter((i) => i.checked)

  const isCollapsing = (id: ID) => pending.has(id)
  const visualChecked = (item: ChecklistItem) => {
    const p = pending.get(item.id)
    return typeof p === 'boolean' ? p : item.checked
  }

  const commitToggle = (id: ID, target: boolean) =>
    onChange(itemsRef.current.map((i) => (i.id === id ? { ...i, checked: target } : i)))

  // Mark the row pending (collapsing), then after the animation run `commit`,
  // which drops or relocates it. Clears its own timer on finalize.
  const scheduleExit = (id: ID, value: 'remove' | boolean, commit: () => void) => {
    setPending((prev) => new Map(prev).set(id, value))
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id)
        setPending((prev) => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        commit()
      }, EXIT_MS),
    )
  }

  const handlers: RowHandlers = {
    onToggle: (id) => {
      const current = items.find((i) => i.id === id)
      if (!current) return
      const target = !current.checked
      // Reduced motion (or a rapid re-toggle): just flip now.
      if (reduceMotion || timers.current.has(id)) commitToggle(id, target)
      else scheduleExit(id, target, () => commitToggle(id, target))
    },
    onText: (id, text) => onChange(items.map((i) => (i.id === id ? { ...i, text } : i))),
    onRemove: (id) => {
      const drop = () => onChange(itemsRef.current.filter((i) => i.id !== id))
      // Reduced motion (or already animating): remove immediately.
      if (reduceMotion || timers.current.has(id)) drop()
      else scheduleExit(id, 'remove', drop)
    },
    onEnter: (id, start, end) => {
      const current = items.find((i) => i.id === id)
      if (!current) return
      // Split at the caret: text before stays, text in/after the selection moves
      // to a new row inserted right below (same group), focused at its start.
      const before = current.text.slice(0, start)
      const after = current.text.slice(end)
      const group = current.checked ? checked : unchecked
      const idx = group.findIndex((i) => i.id === id)
      const next = group[idx + 1]
      const newItem = {
        id: newId(),
        text: after,
        checked: current.checked,
        order: orderBetween(current.order, next ? next.order : null),
      }
      onChange([...items.map((i) => (i.id === id ? { ...i, text: before } : i)), newItem])
      setFocusTarget({ id: newItem.id, caret: 0 })
    },
    onBackspace: (id) => {
      const current = items.find((i) => i.id === id)
      if (!current) return false
      // Merge backward within the same group (unchecked or checked); the first
      // row in its group has nothing above it, so leave the keystroke alone.
      const group = current.checked ? checked : unchecked
      const idx = group.findIndex((i) => i.id === id)
      if (idx <= 0) return false
      const prev = group[idx - 1]
      // Append this row's text to the previous one and drop this row; the caret
      // lands at the junction (the previous text's original end).
      onChange(
        items
          .map((i) => (i.id === prev.id ? { ...i, text: prev.text + current.text } : i))
          .filter((i) => i.id !== id),
      )
      setFocusTarget({ id: prev.id, caret: prev.text.length })
      return true
    },
  }

  // Append a blank item and hand focus to it; typing flows through the normal
  // row input, so the new row is a regular item from the start.
  const addItem = () => {
    const last = sorted.at(-1)?.order ?? null
    const id = newId()
    onChange([...items, { id, text: '', checked: false, order: orderAtEnd(last) }])
    setFocusTarget({ id, caret: 'end' })
  }

  // A brand-new list opens empty; seed one item and focus it so the user can
  // type straight away.
  const didInit = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: run-once seed on mount; the didInit ref guards against re-runs.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (items.length === 0) addItem()
  }, [])

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = unchecked.map((i) => i.id)
    const from = ids.indexOf(active.id as ID)
    const to = ids.indexOf(over.id as ID)
    if (from === -1 || to === -1) return
    const next = arrayMove(unchecked, from, to)
    const idx = next.findIndex((i) => i.id === active.id)
    const prevOrder = idx > 0 ? next[idx - 1].order : null
    const nextOrder = idx < next.length - 1 ? next[idx + 1].order : null
    const order = orderBetween(prevOrder, nextOrder)
    onChange(items.map((i) => (i.id === active.id ? { ...i, order } : i)))
  }

  return (
    <div className="text-[var(--app-text)]">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={unchecked.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5 md:space-y-0">
            {unchecked.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                collapsing={isCollapsing(item.id)}
                visualChecked={visualChecked(item)}
                autoFocus={item.id === focusTarget?.id}
                caret={focusTarget?.caret}
                {...handlers}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addItem}
        className="mt-1 flex w-full items-center gap-2 text-left text-[var(--app-text-muted)] md:gap-1"
      >
        {/* Empty grip column, then Plus in the checkbox column, so the button
            lines up with the items above it. */}
        <span className="-ml-1 w-8 shrink-0 md:w-5" aria-hidden />
        <span className="mr-1 flex h-11 w-9 shrink-0 items-center justify-start md:h-8 md:w-6">
          <Plus className="size-[26px] md:size-[22px]" />
        </span>
        <span className="py-2.5 text-[15px] md:py-1">List item</span>
      </button>

      {checked.length > 0 && (
        <div className="mt-3 border-[var(--app-border)] border-t pt-2">
          <button
            type="button"
            onClick={() => setShowChecked((v) => !v)}
            className="flex items-center gap-1 text-[var(--app-text-muted)] text-sm"
          >
            {showChecked ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {checked.length} completed {checked.length === 1 ? 'item' : 'items'}
          </button>
          {showChecked && (
            <ul className="mt-1 space-y-0.5 md:space-y-0">
              {checked.map((item) => (
                <StaticRow
                  key={item.id}
                  item={item}
                  collapsing={isCollapsing(item.id)}
                  visualChecked={visualChecked(item)}
                  autoFocus={item.id === focusTarget?.id}
                  caret={focusTarget?.caret}
                  {...handlers}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
