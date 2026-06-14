import { Check, Plus, Tag as TagIcon, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconButton } from '@/components/IconButton'
import { Modal } from '@/components/Modal'
import { useTags } from '@/store/selectors'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore } from '@/store/useUiStore'

function TagRow({ id, name }: { id: string; name: string }) {
  const renameTag = useNotesStore((s) => s.renameTag)
  const deleteTag = useNotesStore((s) => s.deleteTag)
  const [value, setValue] = useState(name)

  useEffect(() => setValue(name), [name])

  const commit = () => {
    const next = value.trim()
    if (next && next !== name) renameTag(id, next)
    else setValue(name)
  }

  return (
    <li className="group/row flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/5">
      <TagIcon size={18} className="shrink-0 text-[var(--app-text-muted)]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent py-1 text-[var(--app-text)] text-sm outline-none focus:border-[var(--app-border)] focus:border-b"
      />
      <IconButton
        label={`Delete label ${name}`}
        size="sm"
        onClick={() => deleteTag(id)}
        className="opacity-0 group-hover/row:opacity-100 max-md:opacity-100"
      >
        <Trash2 size={16} />
      </IconButton>
    </li>
  )
}

export function TagManager() {
  const open = useUiStore((s) => s.tagManagerOpen)
  const setOpen = useUiStore((s) => s.setTagManagerOpen)
  const close = () => setOpen(false)
  const tags = useTags()
  const createTag = useNotesStore((s) => s.createTag)
  const [draft, setDraft] = useState('')

  if (!open) return null

  const add = async () => {
    const name = draft.trim()
    if (!name || tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return
    setDraft('')
    await createTag(name)
  }

  return (
    <Modal title="Edit labels" onClose={close} panelClassName="flex max-h-[80vh] flex-col">
      <div className="flex items-center gap-2 px-4 pb-2">
        <Plus size={18} className="shrink-0 text-[var(--app-text-muted)]" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder="Create new label"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-1 text-[var(--app-text)] text-sm outline-none placeholder:text-[var(--app-text-muted)]"
        />
        {draft.trim() && (
          <IconButton label="Add label" size="sm" onClick={add}>
            <Check size={18} />
          </IconButton>
        )}
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {tags.length === 0 ? (
          <li className="px-1 py-4 text-center text-[var(--app-text-muted)] text-sm">
            No labels yet
          </li>
        ) : (
          tags.map((tag) => <TagRow key={tag.id} id={tag.id} name={tag.name} />)
        )}
      </ul>
    </Modal>
  )
}
