import { create } from 'zustand'
import type { ID } from '@/domain/types'

export type View = 'active' | 'archive' | 'trash'
export type Theme = 'light' | 'dark'

const THEME_KEY = 'ok.theme'

function initialTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark'
  }
  return 'light'
}

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode / storage disabled — theme just won't persist.
  }
}

/**
 * Ephemeral view state: which list is shown, the active tag/search filter, the
 * open editor, drawer visibility, and theme. Kept separate from note data so
 * filtering and editor toggles never touch persistence.
 */
interface UiState {
  view: View
  activeTagId: ID | null
  search: string
  /** Note currently open in the editor, else null. */
  editorNoteId: ID | null
  drawerOpen: boolean
  tagManagerOpen: boolean
  settingsOpen: boolean
  theme: Theme
  /** Selected note ids; a non-empty set means bulk-selection mode is active. */
  selection: ReadonlySet<ID>

  setView: (view: View) => void
  setActiveTag: (tagId: ID | null) => void
  setSearch: (search: string) => void
  openEditor: (noteId: ID) => void
  closeEditor: () => void
  setDrawerOpen: (open: boolean) => void
  setTagManagerOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  toggleSelected: (id: ID) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>((set) => ({
  view: 'active',
  activeTagId: null,
  search: '',
  editorNoteId: null,
  drawerOpen: false,
  tagManagerOpen: false,
  settingsOpen: false,
  theme: initialTheme(),
  selection: new Set(),

  // Switching the primary list clears the tag filter (and any selection) but keeps search.
  setView: (view) => set({ view, activeTagId: null, selection: new Set() }),
  setActiveTag: (activeTagId) => set({ activeTagId, view: 'active', selection: new Set() }),
  setSearch: (search) => set({ search }),
  openEditor: (editorNoteId) => set({ editorNoteId }),
  closeEditor: () => set({ editorNoteId: null }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setTagManagerOpen: (tagManagerOpen) => set({ tagManagerOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleSelected: (id) =>
    set((s) => {
      const selection = new Set(s.selection)
      if (selection.has(id)) selection.delete(id)
      else selection.add(id)
      return { selection }
    }),
  clearSelection: () => set({ selection: new Set() }),
}))
