import { useEffect } from 'react'
import { Shell } from '@/layout/Shell'
import { useNotesStore } from '@/store/useNotesStore'

export default function App() {
  const status = useNotesStore((s) => s.status)
  const init = useNotesStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  if (status === 'loading') {
    // Minimal, instant shell — avoids a flash of empty content on first paint.
    return <div className="h-full bg-[var(--app-bg)]" aria-busy="true" />
  }

  return <Shell />
}
