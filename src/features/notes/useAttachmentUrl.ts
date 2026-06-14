import { useEffect, useState } from 'react'
import type { ID } from '@/domain/types'
import { getRepository } from '@/storage'

/**
 * Resolve an attachment id to an object URL suitable for `<img src>`.
 *
 * The URL is created on mount and revoked on unmount / id change so blob memory
 * is reclaimed promptly when a note closes or rerenders with a different id.
 * Returns `null` while the blob is loading or if the attachment vanished.
 */
export function useAttachmentUrl(id: ID): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    void (async () => {
      const blob = await getRepository().getAttachment(id)
      if (cancelled || !blob) return
      created = URL.createObjectURL(blob)
      setUrl(created)
    })()
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
      setUrl(null)
    }
  }, [id])

  return url
}
