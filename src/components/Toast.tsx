import { useEffect } from 'react'
import { useNotesStore } from '@/store/useNotesStore'

const WRAP =
  'pb-safe pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 md:bottom-6'
const PILL = 'pointer-events-auto rounded-lg bg-[#323232] text-sm text-white shadow-lg'

/**
 * Bottom-centered transient toast. Shows rolled-back-write errors, or — when a
 * note is archived/trashed/deleted — an "Undo" affordance to reverse it.
 * Errors take priority over undo offers.
 */
export function Toast() {
  const error = useNotesStore((s) => s.lastError)
  const clearError = useNotesStore((s) => s.clearError)
  const undo = useNotesStore((s) => s.undo)
  const runUndo = useNotesStore((s) => s.runUndo)
  const clearUndo = useNotesStore((s) => s.clearUndo)

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 4000)
      return () => clearTimeout(t)
    }
    if (undo) {
      const t = setTimeout(clearUndo, 6000)
      return () => clearTimeout(t)
    }
  }, [error, undo, clearError, clearUndo])

  if (error) {
    return (
      <div className={WRAP}>
        <output className={`${PILL} px-4 py-3`}>{error}</output>
      </div>
    )
  }

  if (undo) {
    return (
      <div className={WRAP}>
        <div className={`${PILL} flex items-center gap-2 py-2 pr-2 pl-4`}>
          <span>{undo.message}</span>
          <button
            type="button"
            onClick={() => void runUndo()}
            className="rounded px-3 py-1 font-medium text-[#fdd663] uppercase hover:bg-white/10"
          >
            Undo
          </button>
        </div>
      </div>
    )
  }

  return null
}
