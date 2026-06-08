import sharp from 'sharp'
import { logger } from './logger'

// "LEVE" glyphs in a 167 × 50 local coordinate space.
// Bold geometric sans-serif — zero font dependency, pure SVG geometry.
// L occupies x=[0..35], E [43..78], V [86..124], E [132..167].
// Stroke width: 13 units (~26% of height) for a bold, readable weight.
const LEVE_PATHS =
  // L
  '<rect x="0"   y="0"  width="13" height="50"/>' +
  '<rect x="0"   y="37" width="35" height="13"/>' +
  // E
  '<rect x="43"  y="0"  width="13" height="50"/>' +
  '<rect x="43"  y="0"  width="35" height="13"/>' +
  '<rect x="43"  y="19" width="28" height="11"/>' +
  '<rect x="43"  y="37" width="35" height="13"/>' +
  // V — two diagonal strokes whose bottom edges overlap near centre (x≈105)
  '<polygon points="86,0  99,0  108,50  95,50"/>' +
  '<polygon points="111,0 124,0 115,50 102,50"/>' +
  // E
  '<rect x="132" y="0"  width="13" height="50"/>' +
  '<rect x="132" y="0"  width="35" height="13"/>' +
  '<rect x="132" y="19" width="28" height="11"/>' +
  '<rect x="132" y="37" width="35" height="13"/>'

export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(inputBuffer).metadata()
  const width = meta.width ?? 1024
  const height = meta.height ?? 1024

  const tileSize = Math.floor(width / 4)

  // Scale so the word spans ~50 % of tileSize (~12 % of image width).
  // SVG transform order (right-to-left): scale → translate → rotate.
  const scale = (tileSize * 0.5) / 167
  const tx = tileSize / 2 - (167 * scale) / 2
  const ty = tileSize / 2 - (50 * scale) / 2
  const cx = tileSize / 2
  const cy = tileSize / 2

  const tileSvg = Buffer.from(
    `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">` +
      `<g fill="rgba(255,255,255,0.25)" transform="rotate(-30,${cx},${cy}) translate(${tx},${ty}) scale(${scale})">` +
      LEVE_PATHS +
      `</g></svg>`,
  )

  const tilesX = Math.ceil(width / tileSize) + 1
  const tilesY = Math.ceil(height / tileSize) + 1
  const halfTile = Math.floor(tileSize / 2)

  const overlays: sharp.OverlayOptions[] = []
  for (let row = 0; row < tilesY; row++) {
    // Odd rows offset by half a tile — brick-wall stagger for a more
    // professional watermark pattern. The -30° rotation fills visual gaps.
    const colOffset = row % 2 === 1 ? halfTile : 0
    for (let col = 0; col < tilesX; col++) {
      const left = col * tileSize + colOffset
      if (left >= width) break
      overlays.push({ input: tileSvg, top: row * tileSize, left })
    }
  }

  const output = await sharp(inputBuffer)
    .composite(overlays)
    .jpeg({ quality: 85 })
    .toBuffer()

  logger.debug({ outputBytes: output.length, width, height }, '[watermark] applied')

  return output
}
