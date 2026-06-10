import { Menu } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { SearchBar } from '@/features/search/SearchBar'
import { useUiStore } from '@/store/useUiStore'

export function AppBar() {
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen)

  return (
    <header className="pt-safe sticky top-0 z-30 bg-[var(--app-bg)]">
      <div className="flex items-center gap-2 px-2 py-2 md:px-4">
        {/* Hamburger only on mobile; desktop has the persistent sidebar. */}
        <IconButton label="Open menu" onClick={() => setDrawerOpen(true)} className="md:hidden">
          <Menu size={22} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <SearchBar />
        </div>
      </div>
    </header>
  )
}
