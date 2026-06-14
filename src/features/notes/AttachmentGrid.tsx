import { X } from 'lucide-react'
import { memo } from 'react'
import type { AttachmentMeta, ID } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useAttachmentUrl } from './useAttachmentUrl'

interface ThumbProps {
  attachment: AttachmentMeta
  onRemove?: () => void
  /**
   * `native` preserves the image's own aspect ratio (single-image banner).
   * Otherwise the thumb stretches to fill its parent cell — used inside the
   * mosaic and the editor's grid where uniform cell sizes look better.
   */
  fit?: 'native' | 'fill'
  /** Renders a "+N" overlay on this thumb. */
  overflowCount?: number
  /** When set, the thumb becomes clickable (opens the lightbox). */
  onActivate?: () => void
}

function ThumbImpl({ attachment, onRemove, fit = 'fill', overflowCount, onActivate }: ThumbProps) {
  const url = useAttachmentUrl(attachment.id)
  return (
    <div
      className={cn(
        'group/img relative overflow-hidden bg-black/5 dark:bg-white/5',
        fit === 'fill' ? 'h-full w-full' : 'rounded-lg',
      )}
      style={
        fit === 'native' ? { aspectRatio: `${attachment.width} / ${attachment.height}` } : undefined
      }
    >
      {url && (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}
      {overflowCount && overflowCount > 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55 font-medium text-2xl text-white">
          +{overflowCount}
        </div>
      )}
      {/* Transparent activator covers the image so the whole thumb is clickable
          without nesting buttons inside the X button. Source-ordered before the
          X so the close button stays on top and stops the activator's click. */}
      {onActivate && (
        <button
          type="button"
          aria-label="View image"
          onClick={onActivate}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-blue-500"
        />
      )}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove image"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            'absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white',
            'opacity-0 transition-opacity group-hover/img:opacity-100 focus-visible:opacity-100 max-md:opacity-100',
          )}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

const Thumb = memo(ThumbImpl)

interface AttachmentGridProps {
  attachments: AttachmentMeta[]
  /** Pass to enable per-thumbnail remove buttons (editor only). */
  onRemove?: (id: ID) => void
  /** Click handler — passed the attachment's index. Opens the lightbox. */
  onActivate?: (index: number) => void
}

/** Image grid used inside the editor; the card uses {@link AttachmentBanner}. */
export function AttachmentGrid({ attachments, onRemove, onActivate }: AttachmentGridProps) {
  if (attachments.length === 0) return null
  // Single-image editor preview keeps the native aspect ratio (matches the
  // banner). Multi-image goes uniform-cell since heterogeneous aspect ratios
  // in a 2-col grid look uneven.
  if (attachments.length === 1) {
    const a = attachments[0]
    return (
      <div className="mb-3">
        <Thumb
          attachment={a}
          fit="native"
          onRemove={onRemove ? () => onRemove(a.id) : undefined}
          onActivate={onActivate ? () => onActivate(0) : undefined}
        />
      </div>
    )
  }
  return (
    <div className="mb-3 grid grid-cols-2 gap-1">
      {attachments.map((a, i) => (
        <div key={a.id} className="aspect-square">
          <Thumb
            attachment={a}
            onRemove={onRemove ? () => onRemove(a.id) : undefined}
            onActivate={onActivate ? () => onActivate(i) : undefined}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Card banner mosaic. Layout scales with attachment count:
 *   1  → full-width banner at the image's native aspect ratio
 *   2  → side-by-side, 2:1 box
 *   3  → one big + two stacked (Instagram-style), 3:2 box
 *   4+ → 2×2 grid, square box; 5+ collapses extras into a "+N" overlay on cell 4
 */
export function AttachmentBanner({ attachments }: { attachments: AttachmentMeta[] }) {
  if (attachments.length === 0) return null

  const wrapper = '-mx-4 -mt-4 mb-3 overflow-hidden rounded-t-xl'

  if (attachments.length === 1) {
    const a = attachments[0]
    // Cap portrait aspect ratio so a tall screenshot doesn't make the card
    // dwarf the viewport. width/height ≥ 0.75 means the banner is never more
    // than 4/3× the card width tall; taller images crop via object-cover.
    const aspectRatio = Math.max(a.width / a.height, 0.75)
    return (
      <div className={cn(wrapper, 'bg-black/5 dark:bg-white/5')} style={{ aspectRatio }}>
        <Thumb attachment={a} />
      </div>
    )
  }

  if (attachments.length === 2) {
    return (
      <div className={cn(wrapper, 'grid aspect-[2/1] grid-cols-2 gap-0.5')}>
        {attachments.map((a) => (
          <Thumb key={a.id} attachment={a} />
        ))}
      </div>
    )
  }

  if (attachments.length === 3) {
    const [first, second, third] = attachments
    return (
      <div className={cn(wrapper, 'grid aspect-[3/2] grid-cols-2 grid-rows-2 gap-0.5')}>
        <div className="row-span-2">
          <Thumb attachment={first} />
        </div>
        <Thumb attachment={second} />
        <Thumb attachment={third} />
      </div>
    )
  }

  // 4+: 2×2 grid. The last visible cell carries a "+N more" overlay when there
  // are extras the user can't see — they're still in the editor, just not here.
  const visible = attachments.slice(0, 4)
  const overflow = attachments.length - 4
  return (
    <div className={cn(wrapper, 'grid aspect-square grid-cols-2 grid-rows-2 gap-0.5')}>
      {visible.map((a, i) => (
        <Thumb key={a.id} attachment={a} overflowCount={i === visible.length - 1 ? overflow : 0} />
      ))}
    </div>
  )
}
