import { useEffect, useRef } from 'react'

/**
 * Persists `value` a short delay after it stops changing, and flushes
 * immediately on unmount (e.g. when the editor closes). Keeps typing snappy
 * while guaranteeing nothing is lost.
 */
export function useAutosave<T>(value: T, save: (value: T) => void, delay = 500): void {
  const lastSaved = useRef(value)
  const latest = useRef(value)
  const saveRef = useRef(save)
  latest.current = value
  saveRef.current = save

  useEffect(() => {
    if (value === lastSaved.current) return
    const t = setTimeout(() => {
      lastSaved.current = value
      saveRef.current(value)
    }, delay)
    return () => clearTimeout(t)
  }, [value, delay])

  // Flush any pending change when the component unmounts.
  useEffect(() => {
    return () => {
      if (latest.current !== lastSaved.current) {
        saveRef.current(latest.current)
      }
    }
  }, [])
}
