'use client'

import { useState, type ReactNode, type CSSProperties } from 'react'
import { Maximize2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import { cn } from '@/lib/utils'

interface FullscreenImageProps {
  /** Source for the fullscreen view. When null the affordance is hidden and
   *  the viewer cannot open (nothing to show yet). */
  src: string | null
  /** The visible image content (a plain <img>, the before/after slider, etc.). */
  children: ReactNode
  className?: string
  style?: CSSProperties
  /**
   * 'button' (default): only the small corner icon opens fullscreen. Use when
   * the children own pointer gestures (e.g. the before/after drag slider) and
   * a full-area click target would fight them.
   * 'area': the entire image is a click target. Use for plain, non-interactive
   * images.
   */
  expandTrigger?: 'button' | 'area'
  /** Corner for the expand icon — flip to 'top-left' when a badge sits top-right. */
  iconPosition?: 'top-left' | 'top-right'
  /** Hide the affordance without unmounting (e.g. while an edit is in flight). */
  showAffordance?: boolean
}

/**
 * Shared fullscreen image viewer. Wraps any image content with an expand
 * affordance and a locked-down lightbox: zoom only, close button only — no
 * download, no arrows, no thumbnails, no slideshow. Dark backdrop. Esc /
 * backdrop-click close on desktop, pinch-zoom / swipe-down dismiss on mobile.
 */
export function FullscreenImage({
  src,
  children,
  className,
  style,
  expandTrigger = 'button',
  iconPosition = 'top-right',
  showAffordance = true,
}: FullscreenImageProps) {
  const t = useTranslations('common')
  const [open, setOpen] = useState(false)

  const canOpen = Boolean(src)
  const affordanceVisible = canOpen && showAffordance
  const cornerClass = iconPosition === 'top-left' ? 'top-3 left-3' : 'top-3 right-3'

  return (
    <div className={cn('relative group', className)} style={style}>
      {children}

      {/* Full-area click target for plain images. Sits above the image but
          below the corner icon; children in this mode are non-interactive. */}
      {affordanceVisible && expandTrigger === 'area' && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('view_fullscreen')}
          className="absolute inset-0 z-20 cursor-zoom-in"
        />
      )}

      {/* Corner expand icon — hover-reveal on desktop, always visible on mobile.
          In 'button' mode it is the trigger; in 'area' mode it is a decorative
          cue and the full-area button handles the click. */}
      {affordanceVisible && (
        expandTrigger === 'button' ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('view_fullscreen')}
            className={cn(
              'absolute z-30 p-2.5 rounded-full bg-black/50 border border-white/15 text-white cursor-zoom-in transition-opacity sm:opacity-0 sm:group-hover:opacity-100',
              cornerClass,
            )}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute z-30 p-2.5 rounded-full bg-black/50 border border-white/15 text-white transition-opacity sm:opacity-0 sm:group-hover:opacity-100',
              cornerClass,
            )}
          >
            <Maximize2 className="w-4 h-4" />
          </span>
        )
      )}

      {canOpen && (
        <Lightbox
          open={open}
          close={() => setOpen(false)}
          slides={[{ src: src as string }]}
          plugins={[Zoom]}
          carousel={{ finite: true }}
          controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
          styles={{ container: { backgroundColor: '#0A0A0A' } }}
          zoom={{
            maxZoomPixelRatio: 4,
            zoomInMultiplier: 1.5,
            doubleTapDelay: 300,
            scrollToZoom: true,
          }}
          // Only the close (X) control — no download, no arrows, no extras.
          toolbar={{ buttons: ['close'] }}
          render={{ buttonPrev: () => null, buttonNext: () => null }}
        />
      )}
    </div>
  )
}
