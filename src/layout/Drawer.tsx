import {
  Archive,
  ListChecks,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'
import { useCreateNote } from '@/features/notes/useCreateNote'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { useTagCounts, useTags } from '@/store/selectors'
import { useUiStore, type View } from '@/store/useUiStore'

interface DrawerItemProps {
  icon: ReactNode
  label: string
  active: boolean
  count?: number
  onClick: () => void
}

function DrawerItem({ icon, label, active, count, onClick }: DrawerItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 py-3 pr-4 pl-6 text-left text-sm transition-colors',
        active
          ? 'bg-sky-200/70 font-medium text-[var(--app-text)] dark:bg-sky-400/20'
          : 'text-[var(--app-text)] hover:bg-black/5 dark:hover:bg-white/5',
      )}
    >
      <span className="shrink-0 text-[var(--app-text-muted)]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && count > 0 && (
        <span className="text-xs text-[var(--app-text-muted)]">{count}</span>
      )}
    </button>
  )
}

function DrawerContent({ onNavigate }: { onNavigate: () => void }) {
  const view = useUiStore((s) => s.view)
  const activeTagId = useUiStore((s) => s.activeTagId)
  const setView = useUiStore((s) => s.setView)
  const setActiveTag = useUiStore((s) => s.setActiveTag)
  const setTagManagerOpen = useUiStore((s) => s.setTagManagerOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const tags = useTags()
  const counts = useTagCounts()
  const isDesktop = useIsDesktop()
  const create = useCreateNote()

  const go = (v: View) => {
    setView(v)
    onNavigate()
  }
  // Mobile creates via the bottom FAB, so the sidebar create actions are desktop-only.
  const make = (kind: 'text' | 'checklist') => {
    create(kind)
    onNavigate()
  }
  const goTag = (id: string) => {
    setActiveTag(id)
    onNavigate()
  }

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto py-3">
      {/* Brand doubles as "all notes" / home. */}
      <button
        type="button"
        onClick={() => go('active')}
        className="mb-1 flex items-center gap-3 px-5 py-2 text-left font-medium text-[var(--app-text)] text-lg"
      >
        <Logo size={32} />
        Open Keep
      </button>

      {isDesktop && (
        <>
          <DrawerItem
            icon={<Plus size={20} />}
            label="New note"
            active={false}
            onClick={() => make('text')}
          />
          <DrawerItem
            icon={<ListChecks size={20} />}
            label="New checklist"
            active={false}
            onClick={() => make('checklist')}
          />
          <div className="my-1 border-[var(--app-border)] border-t" />
        </>
      )}

      {tags.length > 0 && (
        <>
          <p className="px-6 pt-3 pb-1 text-xs font-medium text-[var(--app-text-muted)]">Labels</p>
          {tags.map((tag) => (
            <DrawerItem
              key={tag.id}
              icon={<TagIcon size={20} />}
              label={tag.name}
              count={counts[tag.id]}
              active={view === 'active' && activeTagId === tag.id}
              onClick={() => goTag(tag.id)}
            />
          ))}
        </>
      )}

      <DrawerItem
        icon={<Pencil size={20} />}
        label="Edit labels"
        active={false}
        onClick={() => {
          setTagManagerOpen(true)
          onNavigate()
        }}
      />

      <div className="my-1 border-[var(--app-border)] border-t" />

      <DrawerItem
        icon={<Archive size={20} />}
        label="Archive"
        active={view === 'archive'}
        onClick={() => go('archive')}
      />
      <DrawerItem
        icon={<Trash2 size={20} />}
        label="Trash"
        active={view === 'trash'}
        onClick={() => go('trash')}
      />

      <div className="my-1 border-[var(--app-border)] border-t" />

      <DrawerItem
        icon={<SettingsIcon size={20} />}
        label="Settings"
        active={false}
        onClick={() => {
          setSettingsOpen(true)
          onNavigate()
        }}
      />
    </nav>
  )
}

export function Drawer() {
  const isDesktop = useIsDesktop()
  const open = useUiStore((s) => s.drawerOpen)
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen)

  if (isDesktop) {
    return (
      <aside className="w-72 shrink-0 border-[var(--app-border)] border-r">
        <DrawerContent onNavigate={() => {}} />
      </aside>
    )
  }

  return (
    <>
      <div
        aria-hidden
        onClick={() => setDrawerOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'pt-safe fixed inset-y-0 left-0 z-50 w-72 bg-[var(--app-bg)] shadow-xl transition-transform md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!open}
      >
        <DrawerContent onNavigate={() => setDrawerOpen(false)} />
      </aside>
    </>
  )
}
