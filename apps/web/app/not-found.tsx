'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ImageOff } from 'lucide-react'

const CONTAINER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const ITEM = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0, 0, 1] as const } },
}

export default function NotFound() {
  const t = useTranslations('not_found')
  const reduced = useReducedMotion()

  return (
    <div
      className="min-h-[100dvh] bg-[var(--bg-base)] flex flex-col items-center justify-center px-6 relative overflow-hidden"
    >
      {/* Ghost 404 — purely decorative, screen-reader hidden */}
      <span
        aria-hidden
        className="absolute select-none pointer-events-none font-display font-semibold text-text-primary"
        style={{
          fontSize: 'clamp(180px, 40vw, 400px)',
          lineHeight: 1,
          opacity: 0.027,
          letterSpacing: '-0.05em',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        404
      </span>

      {/* Staggered content column */}
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center"
      >
        {/* Studio frame wrapper — enters first, then floats */}
        <motion.div variants={ITEM} className="mb-10">
          <motion.div
            animate={reduced ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, delay: 0.65 }}
            className="relative"
            style={{ width: 160, height: 200 }}
          >
            {/* Viewfinder corner brackets */}
            <span
              aria-hidden
              className="absolute top-0 left-0 w-7 h-7"
              style={{ borderTop: '1.5px solid var(--accent-border)', borderLeft: '1.5px solid var(--accent-border)' }}
            />
            <span
              aria-hidden
              className="absolute top-0 right-0 w-7 h-7"
              style={{ borderTop: '1.5px solid var(--accent-border)', borderRight: '1.5px solid var(--accent-border)' }}
            />
            <span
              aria-hidden
              className="absolute bottom-0 left-0 w-7 h-7"
              style={{ borderBottom: '1.5px solid var(--accent-border)', borderLeft: '1.5px solid var(--accent-border)' }}
            />
            <span
              aria-hidden
              className="absolute bottom-0 right-0 w-7 h-7"
              style={{ borderBottom: '1.5px solid var(--accent-border)', borderRight: '1.5px solid var(--accent-border)' }}
            />

            {/* Centre crosshair */}
            <span
              aria-hidden
              className="absolute"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 16, height: 16 }}
            >
              <span
                className="absolute"
                style={{
                  top: '50%', left: 0, right: 0,
                  height: 1, background: 'var(--accent-border)', opacity: 0.55,
                  transform: 'translateY(-50%)',
                }}
              />
              <span
                className="absolute"
                style={{
                  left: '50%', top: 0, bottom: 0,
                  width: 1, background: 'var(--accent-border)', opacity: 0.55,
                  transform: 'translateX(-50%)',
                }}
              />
            </span>

            {/* Icon + decorative film-strip label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <ImageOff
                style={{
                  width: 36, height: 36,
                  color: 'var(--accent)', opacity: 0.45,
                  strokeWidth: 1.25,
                }}
              />
              <span
                aria-hidden
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '8px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                }}
              >
                no exposure
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={ITEM}
          className="font-display font-semibold text-text-primary text-center mb-3"
          style={{ fontSize: 'clamp(26px, 5.5vw, 38px)', lineHeight: 1.1, maxWidth: 380 }}
        >
          {t('headline')}
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={ITEM}
          className="font-ui text-base text-text-secondary text-center mb-10"
          style={{ maxWidth: 300 }}
        >
          {t('subtext')}
        </motion.p>

        {/* Primary CTA */}
        <motion.div variants={ITEM}>
          <Link
            href="/upload"
            className="btn-primary inline-flex"
            style={{ minWidth: 220 }}
          >
            {t('cta_studio')}
          </Link>
        </motion.div>

        {/* Secondary home link */}
        <motion.div variants={ITEM} className="mt-4">
          <Link
            href="/"
            className="font-ui text-[14px] font-medium text-text-muted hover:text-text-secondary transition-colors"
          >
            {t('cta_home')}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
