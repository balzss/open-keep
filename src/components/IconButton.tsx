import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required since the button has no visible text. */
  label: string
  /** `md` (44px) for primary touch targets; `sm` (32px) for dense rows. */
  size?: 'sm' | 'md'
  active?: boolean
}

export function IconButton({
  label,
  size = 'md',
  active = false,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors',
        'text-[var(--app-text-muted)] hover:bg-black/10 dark:hover:bg-white/10',
        'focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40',
        active && 'text-[var(--app-text)]',
        size === 'md' ? 'h-11 w-11' : 'h-8 w-8',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
