import type { ID } from '@/domain/types'
import { useNote } from '@/store/selectors'

const fmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** Popover panel: read-only metadata about a note. */
export function NoteInfo({ noteId }: { noteId: ID }) {
  const note = useNote(noteId)
  if (!note) return null

  const rows: Array<[string, string]> = [
    ['Created', fmt.format(note.createdAt)],
    ['Last edited', fmt.format(note.updatedAt)],
  ]
  if (note.deletedAt != null) {
    rows.push(['Trashed', fmt.format(note.deletedAt)])
  }

  return (
    <div className="w-60">
      <p className="mb-2 font-medium text-[var(--app-text)] text-sm">Note info</p>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-[var(--app-text-muted)]">{label}</dt>
            <dd className="text-right text-[var(--app-text)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
