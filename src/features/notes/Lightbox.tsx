import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import YarlLightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { AttachmentMeta } from '@/domain/types'
import { getRepository } from '@/storage'

interface Slide {
  src: string
  width: number
  height: number
}

interface LightboxProps {
  attachments: AttachmentMeta[]
  startIndex: number
  onClose: () => void
}

/**
 * Wraps `yet-another-react-lightbox` with our storage layer: resolves each
 * attachment's blob to an object URL on mount and revokes the lot on unmount.
 *
 * YARL ships its own Esc handler, swipe-to-dismiss, pinch-zoom, and slide
 * animation. The parent (NoteEditor) still owns the Android-back history entry
 * so the system back button closes the lightbox before the editor.
 */
export function Lightbox({ attachments, startIndex, onClose }: LightboxProps) {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [currentIndex, setCurrentIndex] = useState(startIndex)

  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    const repo = getRepository()
    void (async () => {
      const built = await Promise.all(
        attachments.map(async (a) => {
          const blob = await repo.getAttachment(a.id)
          if (!blob) return null
          const url = URL.createObjectURL(blob)
          created.push(url)
          return { src: url, width: a.width, height: a.height }
        }),
      )
      if (cancelled) {
        // Lightbox unmounted while we were resolving — drop the URLs we built.
        for (const u of created) URL.revokeObjectURL(u)
        return
      }
      setSlides(built.filter((s): s is Slide => s !== null))
    })()
    return () => {
      cancelled = true
      for (const u of created) URL.revokeObjectURL(u)
    }
  }, [attachments])

  // Render nothing until slides are ready — YARL's `open` toggle would otherwise
  // animate in with an empty slide list before the URLs resolved.
  if (!slides) return null

  return (
    <>
      <YarlLightbox
        open
        close={onClose}
        index={Math.max(0, Math.min(startIndex, slides.length - 1))}
        slides={slides}
        plugins={[Zoom]}
        // padding: 0 lets images extend to the viewport edges. spacing: 0
        // removes the gap between slides so the swipe animation reads as one
        // continuous strip rather than a slideshow with margins.
        carousel={{ finite: true, padding: 0, spacing: 0 }}
        controller={{ closeOnBackdropClick: true }}
        on={{ view: ({ index }) => setCurrentIndex(index) }}
        render={{
          iconClose: () => <X size={22} />,
          iconPrev: () => <ChevronLeft size={28} />,
          iconNext: () => <ChevronRight size={28} />,
          iconZoomIn: () => <ZoomIn size={22} />,
          iconZoomOut: () => <ZoomOut size={22} />,
          // Hide nav buttons entirely when there's only one image.
          ...(slides.length === 1 && {
            buttonPrev: () => null,
            buttonNext: () => null,
          }),
        }}
      />
      {/* DIY counter — YARL's `counter` plugin is ~2 KB for a `{i+1}/{n}` div;
          we render our own sibling at a z-index above YARL's portal. */}
      {slides.length > 1 && (
        <div className="pointer-events-none fixed top-3 left-3 z-[10000] rounded-full bg-black/55 px-3 py-1 font-medium text-sm text-white">
          {currentIndex + 1} / {slides.length}
        </div>
      )}
    </>
  )
}
