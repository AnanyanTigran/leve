import sharp from 'sharp'
import { uploadToS3, buildS3Key } from './s3'
import { downloadFromS3 } from './cloudfront'

interface TextOverlayOptions {
  sourceS3Key: string
  sessionId: string
  jobId: string
  text: string
  position: 'top' | 'center' | 'bottom'
}

const POSITION_Y_FRACTION: Record<string, number> = {
  top: 0.08,
  center: 0.5,
  bottom: 0.88,
}

export async function applyTextOverlayToS3Image(
  opts: TextOverlayOptions,
): Promise<string> {
  const { sourceS3Key, sessionId, jobId, text, position } = opts

  const imageBuffer = await downloadFromS3(sourceS3Key)
  const meta = await sharp(imageBuffer).metadata()
  const w = meta.width ?? 2048
  const h = meta.height ?? 2048

  const fontSize = Math.round(w * 0.038)
  const padding = Math.round(w * 0.05)
  const yFraction = POSITION_Y_FRACTION[position] ?? 0.88
  const yPos = Math.round(h * yFraction)

  const textWidth = Math.min(text.length * fontSize * 0.6 + padding * 2, w * 0.8)
  const pillHeight = fontSize + padding
  const pillX = Math.round((w - textWidth) / 2)
  const pillY = yPos - Math.round(pillHeight * 0.7)
  const pillRadius = Math.round(pillHeight / 2)

  const svgOverlay = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${pillX}"
        y="${pillY}"
        width="${textWidth}"
        height="${pillHeight}"
        rx="${pillRadius}"
        fill="rgba(0,0,0,0.55)"
      />
      <text
        x="${w / 2}"
        y="${yPos}"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="white"
        letter-spacing="0.5"
      >${escapeXml(text)}</text>
    </svg>
  `)

  const composited = await sharp(imageBuffer)
    .composite([{ input: svgOverlay, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer()

  // New file — preserves the clean original
  const overlayKey = buildS3Key('previews', sessionId, `${jobId}-overlay.jpg`)
  await uploadToS3(overlayKey, composited, 'image/jpeg')

  return overlayKey
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .slice(0, 80)
}
