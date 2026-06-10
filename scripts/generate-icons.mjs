// Generates the PWA PNG icons from scratch (no image deps) so the manifest is
// satisfied and the app is installable. Re-run with: node scripts/generate-icons.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const BLUE = [56, 189, 248] // #38bdf8
const DARK = [32, 33, 36] // #202124

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

/** Draws a blue rounded square with three dark "note lines". */
function render(size) {
  const px = (x, y) => {
    const r = size * 0.16 // corner radius
    // rounded-corner mask
    const cx = Math.min(x, size - 1 - x)
    const cy = Math.min(y, size - 1 - y)
    if (cx < r && cy < r && Math.hypot(r - cx, r - cy) > r) return null // transparent
    // note lines
    const lineH = size * 0.08
    const x0 = size * 0.25
    const lines = [
      { y: size * 0.3, w: 0.5 },
      { y: size * 0.46, w: 0.5 },
      { y: size * 0.62, w: 0.3 },
    ]
    for (const l of lines) {
      if (y >= l.y && y < l.y + lineH && x >= x0 && x < x0 + size * l.w) return DARK
    }
    return BLUE
  }

  const raw = Buffer.alloc((size * 4 + 1) * size)
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const c = px(x, y)
      if (c === null) {
        raw[o++] = 0
        raw[o++] = 0
        raw[o++] = 0
        raw[o++] = 0
      } else {
        raw[o++] = c[0]
        raw[o++] = c[1]
        raw[o++] = c[2]
        raw[o++] = 255
      }
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const dir = fileURLToPath(new URL('../public/', import.meta.url))
const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of targets) {
  writeFileSync(dir + name, render(size))
  console.log(`wrote public/${name} (${size}x${size})`)
}
