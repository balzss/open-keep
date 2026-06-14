/**
 * Image utilities: loading, optional resize (to keep IDB payloads sane), and
 * base64 codecs for the export/import path.
 */

/** Hard cap on the longest edge after resize. Big enough to look sharp on a phone screen. */
export const MAX_IMAGE_EDGE = 2048
/** Max accepted input size — keeps IDB writes snappy and avoids OOM on resize. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024 // 25 MB

export interface PreparedImage {
  blob: Blob
  mime: string
  width: number
  height: number
}

/**
 * Decode and (if oversized) re-encode to fit within {@link MAX_IMAGE_EDGE}.
 * Returns the original blob when it's already within bounds so we never
 * needlessly transcode (which would also strip orientation EXIF).
 */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const { width: w, height: h } = bitmap
    const longest = Math.max(w, h)
    if (longest <= MAX_IMAGE_EDGE) {
      return { blob: file, mime: file.type || 'image/jpeg', width: w, height: h }
    }
    const scale = MAX_IMAGE_EDGE / longest
    const tw = Math.round(w * scale)
    const th = Math.round(h * scale)
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    ctx.drawImage(bitmap, 0, 0, tw, th)
    // JPEG keeps photos small; the original mime is preserved when we don't resize.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    )
    if (!blob) throw new Error('Could not encode image')
    return { blob, mime: blob.type || 'image/jpeg', width: tw, height: th }
  } finally {
    bitmap.close()
  }
}

/** Encode a Blob as raw base64 (no `data:` prefix). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  // btoa needs a binary string; chunk to avoid the call-stack limit on big blobs.
  const bytes = new Uint8Array(buf)
  const CHUNK = 0x8000
  let s = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(s)
}

/** Inverse of {@link blobToBase64}: rebuild a Blob from raw base64. */
export function decodeBase64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
