import type { CSSProperties } from 'react'
import { BADGE_INSET_FRACTION, type BadgePresetSpec } from '@leve/types'

// The badge is sized relative to the image it sits on using container query
// units (cqw = 1% of the containing element's inline size). Any ancestor with
// `container-type: inline-size` becomes the reference — so the same spec scales
// correctly whether it renders over the full download preview or a tiny sample
// tile, with no ResizeObserver. The baked SVG (api/lib/text-overlay.ts) uses the
// same fractions against the real image width, so preview and download match.

const INSET_CQW = `${BADGE_INSET_FRACTION * 100}cqw`

function positionStyle(spec: BadgePresetSpec): CSSProperties {
  switch (spec.anchor) {
    case 'top-left':
      return { top: INSET_CQW, left: INSET_CQW }
    case 'top-center':
      return { top: INSET_CQW, left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-center':
      return { bottom: INSET_CQW, left: '50%', transform: 'translateX(-50%)' }
    case 'bottom-right':
    default:
      return { bottom: INSET_CQW, right: INSET_CQW }
  }
}

/** Inline styles for a single rendered badge, positioned per its preset. */
export function badgeBoxStyle(spec: BadgePresetSpec): CSSProperties {
  return {
    position: 'absolute',
    display: 'block',
    fontSize: `${spec.fontScale * 100}cqw`,
    padding: `${spec.padYEm}em ${spec.padXEm}em`,
    borderRadius: spec.radiusEm === 'pill' ? '9999px' : `${spec.radiusEm}em`,
    background: spec.fill,
    color: spec.textColor,
    textTransform: spec.uppercase ? 'uppercase' : 'none',
    letterSpacing: `${spec.trackingEm}em`,
    fontWeight: spec.fontWeight,
    fontFamily: "'Plus Jakarta Sans', var(--font-ui), sans-serif",
    lineHeight: 1,
    maxWidth: `${spec.maxWidthFraction * 100}cqw`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...positionStyle(spec),
  }
}
