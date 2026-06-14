import { useCallback, useEffect, useRef } from 'react'
import type { ID } from '@/domain/types'
import { useNotesStore } from '@/store/useNotesStore'

/**
 * Wire up the three ways a user can attach an image to a note:
 *  - the hidden file input (returned from this hook),
 *  - pasting an image (clipboard),
 *  - dropping image files anywhere on the editor surface.
 *
 * The picker takes a `noteId` rather than a callback so it can flush each image
 * straight to the store — the editor doesn't need to babysit pending uploads.
 */
export function useImagePicker(noteId: ID, enabled = true) {
  const addAttachment = useNotesStore((s) => s.addAttachment)
  const fileRef = useRef<HTMLInputElement>(null)

  const addAll = useCallback(
    async (files: Iterable<File | Blob>) => {
      // Sequential — IDB can handle parallel writes but image decode is heavy,
      // and on mobile two big photos in parallel will starve the main thread.
      for (const f of files) {
        if (f.type.startsWith('image/')) await addAttachment(noteId, f)
      }
    },
    [addAttachment, noteId],
  )

  // Paste handler — listens globally on the document because the editor's
  // active text field varies (title vs body vs checklist row) and we want any
  // of them to accept clipboard images.
  useEffect(() => {
    if (!enabled) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files: File[] = []
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile()
          if (f) files.push(f)
        }
      }
      if (files.length) {
        e.preventDefault()
        void addAll(files)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [addAll, enabled])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      e.preventDefault()
      void addAll(files)
    },
    [addAll],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.items).some((i) => i.kind === 'file')) {
      e.preventDefault()
    }
  }, [])

  const openPicker = useCallback(() => fileRef.current?.click(), [])

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length) void addAll(files)
      e.target.value = ''
    },
    [addAll],
  )

  return { fileRef, openPicker, onFileInput, onDrop, onDragOver }
}
