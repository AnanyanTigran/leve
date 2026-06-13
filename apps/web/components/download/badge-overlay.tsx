'use client'

import { BADGE_PRESETS, type BadgePresetId } from '@leve/types'
import { badgeBoxStyle } from '@/lib/badge'

interface Props {
  preset: BadgePresetId
  text: string
}

/**
 * Renders the seller's chosen badge over an image. Must be placed inside an
 * element with `container-type: inline-size` so the badge scales to the image.
 * Decorative + non-interactive — never blocks the image's own click targets.
 */
export function BadgeOverlay({ preset, text }: Props) {
  const label = text.trim()
  if (!label) return null
  const spec = BADGE_PRESETS[preset]

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      <span style={badgeBoxStyle(spec)}>{label}</span>
    </div>
  )
}
