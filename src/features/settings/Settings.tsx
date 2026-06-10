import { Download, Moon, Sun, Upload } from 'lucide-react'
import { useRef } from 'react'
import { Modal } from '@/components/Modal'
import type { DataSnapshot } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useNotesStore } from '@/store/useNotesStore'
import { type Theme, useUiStore } from '@/store/useUiStore'

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

function isSnapshot(value: unknown): value is DataSnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as DataSnapshot).notes) &&
    Array.isArray((value as DataSnapshot).tags)
  )
}

export function Settings() {
  const open = useUiStore((s) => s.settingsOpen)
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const setOpen = useUiStore((s) => s.setSettingsOpen)
  const exportData = useNotesStore((s) => s.exportData)
  const importData = useNotesStore((s) => s.importData)
  const fileRef = useRef<HTMLInputElement>(null)
  const close = () => setOpen(false)

  if (!open) return null

  const handleExport = async () => {
    const snapshot = await exportData()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `open-keep-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (file: File) => {
    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      useNotesStore.setState({ lastError: 'That file isn’t valid JSON' })
      return
    }
    if (!isSnapshot(data)) {
      useNotesStore.setState({ lastError: 'That file isn’t an Open Keep backup' })
      return
    }
    if (!window.confirm('Importing replaces all current notes and labels. Continue?')) return
    await importData(data)
    close()
  }

  return (
    <Modal title="Settings" onClose={close}>
      <div className="px-4 pb-3">
        <p className="mb-2 font-medium text-[var(--app-text-muted)] text-xs uppercase tracking-wide">
          Appearance
        </p>
        <div
          className="flex gap-2 rounded-xl bg-[var(--app-surface-2)] p-1"
          role="radiogroup"
          aria-label="Theme"
        >
          {THEMES.map(({ value, label, icon: Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 font-medium text-sm transition-colors',
                  active
                    ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm'
                    : 'text-[var(--app-text-muted)]',
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-5">
        <p className="mb-2 font-medium text-[var(--app-text-muted)] text-xs uppercase tracking-wide">
          Data
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--app-surface-2)] py-2 font-medium text-[var(--app-text)] text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Download size={18} />
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--app-surface-2)] py-2 font-medium text-[var(--app-text)] text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Upload size={18} />
            Import
          </button>
        </div>
        <p className="mt-2 text-[var(--app-text-muted)] text-xs">
          Export saves all notes and labels to a JSON file. Import replaces everything with a
          backup.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </Modal>
  )
}
