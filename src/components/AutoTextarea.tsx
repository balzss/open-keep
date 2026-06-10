import { type Ref, type TextareaHTMLAttributes, useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string
  ref?: Ref<HTMLTextAreaElement>
}

/** Textarea that grows to fit its content (no inner scrollbar). */
export function AutoTextarea({ value, className, ref: forwardedRef, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: resize must track value
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      // Keep the internal resize ref while honouring a forwarded ref (callers
      // that need focus/caret control, e.g. checklist rows).
      ref={(el) => {
        ref.current = el
        if (typeof forwardedRef === 'function') forwardedRef(el)
        else if (forwardedRef) forwardedRef.current = el
      }}
      value={value}
      rows={1}
      // Free-text field: stop Android Chrome's password-manager heuristic from
      // offering credential autofill in the keyboard. Callers can override.
      autoComplete="off"
      className={cn('w-full resize-none overflow-hidden bg-transparent outline-none', className)}
      {...rest}
    />
  )
}
