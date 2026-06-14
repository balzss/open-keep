import { useEffect, useRef } from 'react'

let counter = 0

interface BackDismissState {
  __backDismiss: number
}

function isOurEntry(state: unknown, token: number): boolean {
  return (state as BackDismissState | null)?.__backDismiss === token
}

/**
 * Dismiss a layer (editor, modal, drawer, selection mode…) when the user
 * presses the system back button — on Android PWA, swipe-back on iOS, or the
 * browser back arrow. Opening pushes a history entry; back pops it and fires
 * `onDismiss`. A UI-driven close pops our entry too so the stack stays in sync.
 *
 * Stacks naturally: two open layers push two entries, and back closes them
 * LIFO.
 */
export function useBackDismiss(isOpen: boolean, onDismiss: () => void): void {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!isOpen) return
    const token = ++counter
    let cancelled = false
    let pushed = false

    // Ignore pops that don't cross our entry. Without this, an inner layer
    // closing via UI (which pops its own entry to keep the stack in sync) would
    // fire popstate that the outer layer's listener would treat as a back press
    // and dismiss the outer layer too.
    const onPop = () => {
      const s = history.state as BackDismissState | null
      if (s && s.__backDismiss >= token) return
      dismissRef.current()
    }

    // Defer to a microtask so React StrictMode's dev-only setup→cleanup→setup
    // cycle never touches history. Without this, the first cleanup's
    // history.back() fires popstate that the second setup's listener catches,
    // dismissing the layer the moment it opens.
    queueMicrotask(() => {
      if (cancelled) return
      history.pushState({ __backDismiss: token } satisfies BackDismissState, '')
      pushed = true
      window.addEventListener('popstate', onPop)
    })

    return () => {
      cancelled = true
      if (!pushed) return
      window.removeEventListener('popstate', onPop)
      // UI-driven close: our entry is still on top — pop it so a later back
      // press doesn't dismiss a phantom layer. If popstate already fired,
      // history.state has moved past our token and this is a no-op.
      if (isOurEntry(history.state, token)) history.back()
    }
  }, [isOpen])
}
