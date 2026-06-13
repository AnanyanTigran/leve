import sharp from 'sharp'
import { uploadToS3, buildS3Key } from './s3'
import { downloadFromS3 } from './cloudfront'

// Server-side mirror of the badge specs in @leve/types. Kept local (the api
// compiles inside its own rootDir and does not reach into packages/types,
// matching SERVER_PLATFORM_SPECS in export.service.ts). The two must stay in
// sync — the shared spec is the source of truth for the look the seller sees.
export type BadgePresetId = 'price' | 'sale' | 'new' | 'brand'
type BadgeAnchor = 'top-left' | 'top-center' | 'bottom-center' | 'bottom-right'

interface BadgePresetSpec {
  id: BadgePresetId
  anchor: BadgeAnchor
  fill: string
  textColor: string
  fontScale: number
  padXEm: number
  padYEm: number
  radiusEm: number | 'pill'
  uppercase: boolean
  trackingEm: number
  fontWeight: number
  maxWidthFraction: number
}

const BADGE_INSET_FRACTION = 0.05

const SERVER_BADGE_PRESETS: Record<BadgePresetId, BadgePresetSpec> = {
  price: { id: 'price', anchor: 'bottom-right', fill: '#D64C1A', textColor: '#FFFFFF', fontScale: 0.05, padXEm: 0.72, padYEm: 0.42, radiusEm: 0.42, uppercase: false, trackingEm: 0, fontWeight: 600, maxWidthFraction: 0.6 },
  sale: { id: 'sale', anchor: 'top-left', fill: '#D64C1A', textColor: '#FFFFFF', fontScale: 0.052, padXEm: 0.6, padYEm: 0.36, radiusEm: 0.22, uppercase: true, trackingEm: 0.02, fontWeight: 600, maxWidthFraction: 0.55 },
  new: { id: 'new', anchor: 'top-center', fill: '#FFFFFF', textColor: '#0A0A0A', fontScale: 0.032, padXEm: 0.95, padYEm: 0.55, radiusEm: 'pill', uppercase: true, trackingEm: 0.2, fontWeight: 600, maxWidthFraction: 0.8 },
  brand: { id: 'brand', anchor: 'bottom-center', fill: 'rgba(10,10,10,0.45)', textColor: '#FFFFFF', fontScale: 0.03, padXEm: 0.9, padYEm: 0.5, radiusEm: 'pill', uppercase: true, trackingEm: 0.14, fontWeight: 600, maxWidthFraction: 0.7 },
}

export interface BadgeValue {
  preset: BadgePresetId
  text: string
}

interface ApplyBadgesOptions {
  sourceS3Key: string
  sessionId: string
  jobId: string
  badges: BadgeValue[]
}

// Rough advance width per character relative to font size. Sellers' labels are
// short (prices, "SALE 30%", store names), so a single estimate keeps the baked
// badge box close to the live CSS preview without measuring glyphs server-side.
const CHAR_ADVANCE = 0.56

const VALID_PRESETS: ReadonlySet<string> = new Set<BadgePresetId>(['price', 'sale', 'new', 'brand'])

/**
 * Normalise a stored overlayBadges JSON value into a clean, de-duplicated list.
 * Defensive against malformed data: drops unknown presets and empty text, keeps
 * at most one badge per preset (each preset owns a fixed anchor), caps at 4.
 */
export function parseBadges(raw: unknown): BadgeValue[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: BadgeValue[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const preset = (item as Record<string, unknown>).preset
    const text = (item as Record<string, unknown>).text
    if (typeof preset !== 'string' || !VALID_PRESETS.has(preset)) continue
    if (typeof text !== 'string' || !text.trim()) continue
    if (seen.has(preset)) continue
    seen.add(preset)
    out.push({ preset: preset as BadgePresetId, text: text.trim() })
    if (out.length >= 4) break
  }
  return out
}

// One <rect>+<text> group for a single badge, positioned by its preset anchor.
function badgeSvgGroup(spec: BadgePresetSpec, text: string, w: number, h: number): string {
  const label = (spec.uppercase ? text.toUpperCase() : text).slice(0, 80)

  const fontSize = Math.round(w * spec.fontScale)
  const padX = Math.round(fontSize * spec.padXEm)
  const padY = Math.round(fontSize * spec.padYEm)
  const tracking = fontSize * spec.trackingEm
  const inset = Math.round(w * BADGE_INSET_FRACTION)

  // Estimate the rendered text width (chars + inter-letter tracking), then the
  // padded box, clamped to the preset's max share of the image width.
  const rawTextWidth = label.length * fontSize * CHAR_ADVANCE + Math.max(0, label.length - 1) * tracking
  const maxBoxWidth = w * spec.maxWidthFraction
  const boxWidth = Math.min(rawTextWidth + padX * 2, maxBoxWidth)
  const boxHeight = fontSize + padY * 2
  const radius = spec.radiusEm === 'pill' ? Math.round(boxHeight / 2) : Math.round(fontSize * spec.radiusEm)

  // Box top-left from the preset anchor.
  let boxX: number
  let boxY: number
  switch (spec.anchor) {
    case 'top-left':
      boxX = inset
      boxY = inset
      break
    case 'top-center':
      boxX = Math.round((w - boxWidth) / 2)
      boxY = inset
      break
    case 'bottom-center':
      boxX = Math.round((w - boxWidth) / 2)
      boxY = h - inset - boxHeight
      break
    case 'bottom-right':
    default:
      boxX = w - inset - boxWidth
      boxY = h - inset - boxHeight
      break
  }

  const textX = Math.round(boxX + boxWidth / 2)
  const textY = Math.round(boxY + boxHeight / 2)

  return `
    <rect
      x="${boxX}"
      y="${boxY}"
      width="${Math.round(boxWidth)}"
      height="${boxHeight}"
      rx="${radius}"
      fill="${spec.fill}"
    />
    <text
      x="${textX}"
      y="${textY}"
      text-anchor="middle"
      dominant-baseline="central"
      font-family="'Plus Jakarta Sans', 'Inter', Arial, Helvetica, sans-serif"
      font-size="${fontSize}"
      font-weight="${spec.fontWeight}"
      fill="${spec.textColor}"
      letter-spacing="${tracking.toFixed(1)}"
    >${escapeXml(label)}</text>`
}

/**
 * Bakes one or more pre-designed badges onto an S3 image in a single composite
 * and returns a new key. The look, shape, casing and placement all come from the
 * shared BADGE_PRESETS spec — the same source the web preview reads — so the
 * download matches what the seller saw. Each preset owns a fixed anchor, so
 * multiple badges (e.g. price + sale) compose without overlapping. The clean
 * original is never mutated; an empty list returns the source key untouched.
 */
export async function applyBadgesToS3Image(
  opts: ApplyBadgesOptions,
): Promise<string> {
  const { sourceS3Key, sessionId, jobId, badges } = opts
  const valid = parseBadges(badges)
  if (valid.length === 0) return sourceS3Key

  const imageBuffer = await downloadFromS3(sourceS3Key)
  const meta = await sharp(imageBuffer).metadata()
  const w = meta.width ?? 2048
  const h = meta.height ?? 2048

  const groups = valid
    .map((b) => badgeSvgGroup(SERVER_BADGE_PRESETS[b.preset], b.text, w, h))
    .join('\n')

  const svgOverlay = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      ${groups}
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
