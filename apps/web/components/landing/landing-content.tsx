'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Zap, Package, CheckCircle } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { IntentCard } from '@/components/landing/intent-card'
import { ThemeToggle } from '../shared/theme-toggle'

const INTENTS = [
  {
    id: 'sell',
    icon: Camera,
    label: 'Sell product',
    sublabel: 'Social & marketplace ready',
  },
  {
    id: 'story',
    icon: Zap,
    label: 'Story & sale',
    sublabel: 'Promote with impact',
  },
  {
    id: 'marketplace',
    icon: Package,
    label: 'Marketplace upload',
    sublabel: 'Wildberries & Ozon',
  },
] as const

const SHOWCASE_CARDS = [
  {
    category: 'Jewelry',
    template: 'Jewelry Luxury',
    leftBg: '#E8E8E8',
    rightBg: 'linear-gradient(135deg, #f0ebe4, #e2d5c8)',
  },
  {
    category: 'Beauty',
    template: 'Luxury Cosmetics',
    leftBg: '#E8E8E8',
    rightBg: 'linear-gradient(135deg, #fef0eb, #fad5c4)',
  },
  {
    category: 'Marketplace',
    template: 'Wildberries Standard',
    leftBg: '#E8E8E8',
    rightBg: '#FAFAFA',
  },
] as const

const STEPS = [
  {
    number: 1,
    title: 'Upload your photo',
    description: 'Any product, any background, taken on your phone',
  },
  {
    number: 2,
    title: 'Choose a style',
    description: '10 professional templates built for Armenian market aesthetics',
  },
  {
    number: 3,
    title: 'Download and post',
    description: 'HD image ready for Instagram, Wildberries, or Ozon in seconds',
  },
] as const

export function LandingContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const router = useRouter()

  function handleSelect(id: string) {
    setSelectedId(id)
    setTimeout(() => {
      router.push('/upload')
    }, 200)
  }

  function handleCTAClick() {
    router.push('/upload')
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <AppHeader variant="landing" rightSlot={<ThemeToggle />} />

      <main className="flex-1">
        {/* SECTION 1 — Hero */}
        <section className="px-4 pt-12 pb-8 lg:pt-16">
          <div className="mb-8 lg:mb-12 lg:text-center w-full max-w-[560px] mx-auto">
            <p className="text-xs font-ui font-medium text-accent uppercase tracking-[0.15em] mb-3">
              AI product photography
            </p>
            <h1 className="font-display font-semibold text-[40px] leading-[1.05] text-text-primary lg:text-[56px] text-balance">
              Your product.
              <br />
              Studio quality.
            </h1>
            <p className="mt-4 text-base font-ui text-text-secondary leading-relaxed lg:text-lg lg:mx-auto">
              Upload a photo. Choose a style. Done in 30 seconds.
            </p>

            {/* Intent cards — stacked on all screen sizes */}
            <div className="flex flex-col gap-4 mt-8">
              {INTENTS.map((intent) => (
                <IntentCard
                  key={intent.id}
                  icon={intent.icon}
                  label={intent.label}
                  sublabel={intent.sublabel}
                  selected={selectedId === intent.id}
                  onSelect={() => handleSelect(intent.id)}
                />
              ))}
            </div>

            <p className="text-center text-[12px] text-text-muted mt-4 font-ui">
              Trusted by sellers on Instagram · Wildberries · Ozon
            </p>
          </div>
        </section>

        {/* SECTION 3 — Before/After showcase */}
        <section className="px-4 py-16">
          <div className="max-w-[960px] mx-auto">
            <h2 className="font-display font-semibold text-[28px] text-text-primary text-center mb-3">
              See what LEVE does
            </h2>
            <p className="font-ui text-base text-text-secondary text-center mb-8">
              Real product photos. Transformed in seconds.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SHOWCASE_CARDS.map((card) => (
                <div
                  key={card.template}
                  className="bg-bg-surface border border-border-default rounded-md overflow-hidden"
                >
                  {/* Before/After split */}
                  <div className="relative flex h-[180px]">
                    {/* Before side */}
                    <div
                      className="relative flex-1"
                      style={{ backgroundColor: card.leftBg }}
                    >
                      <span className="absolute top-2 left-2 bg-white text-text-muted text-[11px] font-ui px-2 py-1 rounded-[10px]">
                        Before
                      </span>
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-white" />
                    {/* After side */}
                    <div
                      className={`relative flex-1${card.category === 'Marketplace' ? ' border border-border-default' : ''}`}
                      style={{ background: card.rightBg }}
                    >
                      <span className="absolute top-2 right-2 bg-accent text-white text-[11px] font-ui px-2 py-1 rounded-[10px]">
                        After
                      </span>
                    </div>
                  </div>
                  {/* Card footer */}
                  <div className="p-3">
                    <p className="text-xs font-ui text-text-muted">{card.category}</p>
                    <p className="text-sm font-ui font-semibold text-text-primary mt-0.5">
                      {card.template}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4 — How it works */}
        <section className="bg-bg-base px-4 py-16">
          <div className="max-w-[720px] mx-auto">
            <h2 className="font-display font-semibold text-[28px] text-text-primary text-center mb-12">
              Three steps. Thirty seconds.
            </h2>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
              {/* Connector line — desktop only */}
              <div className="hidden md:block absolute top-4 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-border-default" />

              {STEPS.map((step) => (
                <div key={step.number} className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border-strong bg-bg-base mb-4 relative z-10">
                    <span className="font-ui font-semibold text-[16px] text-text-primary">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-ui font-semibold text-[16px] text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="font-ui text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — Marketplace callout */}
        <section className="bg-bg-surface border-y border-border-default py-12 px-4">
          <div className="max-w-[640px] mx-auto text-center md:text-left">
            <p className="text-xs font-ui font-medium text-accent uppercase tracking-[0.15em]">
              For marketplace sellers
            </p>
            <h2 className="font-display font-semibold text-[24px] text-text-primary mt-2 mb-3 text-balance">
              Pass Wildberries and Ozon image requirements automatically
            </h2>
            <p className="font-ui text-base text-text-secondary leading-relaxed mb-6">
              Correct dimensions, white background, proper padding — generated in one click. No more rejected listings.
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="inline-flex items-center gap-2 bg-bg-elevated border border-border-default rounded-full px-4 py-2 text-[13px] font-ui font-medium text-text-primary">
                <CheckCircle className="w-4 h-4 text-accent" />
                Wildberries compliant
              </span>
              <span className="inline-flex items-center gap-2 bg-bg-elevated border border-border-default rounded-full px-4 py-2 text-[13px] font-ui font-medium text-text-primary">
                <CheckCircle className="w-4 h-4 text-accent" />
                Ozon compliant
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 6 — Final CTA */}
        <section className="py-16 px-4 text-center">
          <h2 className="font-display font-semibold text-[28px] text-text-primary mb-3">
            Ready to try it?
          </h2>
          <p className="font-ui text-base text-text-secondary mb-8">
            Upload your first photo free. No account needed.
          </p>
          <button
            type="button"
            onClick={handleCTAClick}
            className="btn-primary inline-flex px-12 text-base"
          >
            {"Upload a photo \u2192"}
          </button>
        </section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="bg-bg-surface border-t border-border-default py-5 px-4">
        <div className="max-w-[960px] mx-auto flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <span className="text-xs font-ui text-text-muted">
            © 2025 LEVE
          </span>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
