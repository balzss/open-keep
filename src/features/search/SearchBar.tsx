import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconButton } from '@/components/IconButton'
import { useDebounced } from '@/hooks/useDebounced'
import { useUiStore } from '@/store/useUiStore'

/**
 * Search input. Holds local text for instant feedback and pushes a debounced
 * value into the store so filtering doesn't run on every keystroke.
 */
export function SearchBar() {
  const storeSearch = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const [text, setText] = useState(storeSearch)
  const debounced = useDebounced(text, 200)

  useEffect(() => {
    setSearch(debounced)
  }, [debounced, setSearch])

  // Keep in sync if search is cleared elsewhere (e.g. switching views).
  useEffect(() => {
    if (storeSearch === '') setText('')
  }, [storeSearch])

  return (
    // Fixed height so the bar doesn't grow when the (taller) clear button
    // appears once text is entered.
    <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[var(--app-surface-2)] px-3">
      <Search size={20} className="shrink-0 text-[var(--app-text-muted)]" />
      <input
        // Not type="search": that adds Chrome's native clear "X" (duplicating
        // ours) and search-specific sizing that shifts on focus. inputMode keeps
        // the search-style keyboard on mobile.
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search notes"
        aria-label="Search notes"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--app-text-muted)]"
      />
      {text && (
        <IconButton label="Clear search" size="sm" onClick={() => setText('')} className="-mr-1">
          <X size={18} />
        </IconButton>
      )}
    </div>
  )
}
