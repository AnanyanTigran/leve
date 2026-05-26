import sharp from 'sharp'

/**
 * Applies a diagonal tiled "LEVE" watermark to an image buffer.
 * Used for anonymous preview images only.
 * Verified user downloads are served without watermark via signed URL.
 */
export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata()
  const width = meta.width ?? 1024
  const height = meta.height ?? 1024

  const tileSize = Math.floor(width / 4)
  const fontSize = Math.floor(tileSize / 5)

  const tileSvg = Buffer.from(`
    <svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%" y="50%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="rgba(255,255,255,0.35)"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-30, ${tileSize / 2}, ${tileSize / 2})"
      >LEVE</text>
    </svg>
  `)

  const tilesX = Math.ceil(width / tileSize) + 1
  const tilesY = Math.ceil(height / tileSize) + 1

  const overlays: sharp.OverlayOptions[] = []
  for (let row = 0; row < tilesY; row++) {
    for (let col = 0; col < tilesX; col++) {
      overlays.push({
        input: tileSvg,
        top: row * tileSize,
        left: col * tileSize,
      })
    }
  }

  return sharp(inputBuffer)
    .composite(overlays)
    .jpeg({ quality: 85 })
    .toBuffer()
}
