import { useCallback } from 'react'
import type { NoteKind } from '@/domain/types'
import { newId } from '@/lib/id'
import { useNotesStore } from '@/store/useNotesStore'
import { useUiStore } from '@/store/useUiStore'

/** Creates a fresh note of the given kind and opens it in the editor. */
export function useCreateNote() {
  const createNote = useNotesStore((s) => s.createNote)
  const openEditor = useUiStore((s) => s.openEditor)
  const activeTagId = useUiStore((s) => s.activeTagId)

  return useCallback(
    (kind: NoteKind) => {
      // Generate the id up front so we can insert and open in the same tick.
      // createNote's optimistic insert runs synchronously (it only awaits the
      // persistence write afterwards), so React batches the note appearing in
      // the grid and the editor opening into one commit — no flash of the empty
      // card before the editor appears.
      const id = newId()
      // When viewing a label, new notes inherit it so they stay in view.
      const tagIds = activeTagId ? [activeTagId] : []
      void createNote(kind, { id, tagIds })
      openEditor(id)
    },
    [createNote, openEditor, activeTagId],
  )
}
