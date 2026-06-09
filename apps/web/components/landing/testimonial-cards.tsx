'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useTranslations } from 'next-intl'

const TESTIMONIAL_META = [
  { key: '1', initials: 'AN', avatarBg: '#D64C1A' },
  { key: '2', initials: 'MH', avatarBg: '#2A2A2A' },
  { key: '3', initials: 'VG', avatarBg: '#1E1E1E' },
] as const

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const, delay: i * 0.12 },
  }),
}

export function TestimonialCards() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const t = useTranslations('landing')

  return (
    <section ref={ref} className="w-full py-16 px-4" style={{ background: '#0A0A0A' }}>
      <div className="max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4 }}
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-10"
          style={{ color: '#D64C1A' }}
        >
          {t('testimonials_eyebrow')}
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIAL_META.map((meta, i) => (
            <motion.div
              key={meta.key}
              custom={i}
              initial="hidden"
              animate={inView ? 'show' : 'hidden'}
              variants={cardVariants}
              className="group flex flex-col p-6 rounded-xl transition-colors duration-200"
              style={{ background: '#141414', border: '1px solid #2A2A2A', borderRadius: '12px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3A3A3A' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A' }}
            >
              <span
                className="block font-bold leading-none select-none mb-4"
                style={{ fontSize: '64px', lineHeight: '48px', color: '#D64C1A', fontFamily: 'Georgia, serif' }}
                aria-hidden="true"
              >
                &ldquo;
              </span>

              <p
                className="flex-1 text-sm leading-relaxed mb-6"
                style={{ color: '#A0A0A0', fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {t(`testimonial_${meta.key}_quote`)}
              </p>

              <div className="mb-5" style={{ height: '1px', background: '#2A2A2A' }} />

              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0 rounded-full"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: meta.avatarBg,
                    border: meta.avatarBg === '#1E1E1E' || meta.avatarBg === '#2A2A2A' ? '1px solid #3A3A3A' : 'none',
                  }}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.04em' }}
                  >
                    {meta.initials}
                  </span>
                </div>

                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {t(`testimonial_${meta.key}_name`)}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: '#4A4A4A', fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {t(`testimonial_${meta.key}_role`)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
