import { describe, expect, it } from 'vitest'
import { blobToBase64, decodeBase64ToBlob } from '@/lib/image'

describe('blob ⇄ base64 codec', () => {
  it('round-trips a blob through base64', async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 254, 255])
    const blob = new Blob([bytes], { type: 'image/png' })
    const encoded = await blobToBase64(blob)
    const decoded = decodeBase64ToBlob(encoded, 'image/png')
    expect(decoded.type).toBe('image/png')
    const back = new Uint8Array(await decoded.arrayBuffer())
    expect(Array.from(back)).toEqual(Array.from(bytes))
  })
})
