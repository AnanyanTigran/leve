import sharp from 'sharp'

export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata()
  const w = meta.width ?? 1024
  const h = meta.height ?? 1024

  const fontSize = Math.round(w * 0.04)
  const padding = Math.round(w * 0.03)

  const svgOverlay = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${padding}"
        y="${h - padding}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        opacity="0.55"
        letter-spacing="2"
      >LEVE</text>
    </svg>
  `)

  return sharp(imageBuffer)
    .composite([{ input: svgOverlay, blend: 'over' }])
    .jpeg({ quality: 85 })
    .toBuffer()
}
