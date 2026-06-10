import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** Extra panel classes, e.g. height/flex for a scrolling body. */
  panelClassName?: string
}

/** Bottom-sheet on mobile, centered card on desktop. Closes on Escape or backdrop tap. */
export function Modal({ title, onClose, children, panelClassName }: ModalProps) {
  useEscapeKey(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className={cn(
          'pb-safe relative z-10 w-full rounded-t-2xl bg-[var(--app-surface)] shadow-2xl md:w-96 md:rounded-2xl',
          panelClassName,
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-medium text-[var(--app-text)]">{title}</h2>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}
