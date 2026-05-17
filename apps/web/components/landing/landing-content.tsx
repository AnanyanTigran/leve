'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Zap, Package } from 'lucide-react'
import { Header } from '@/components/landing/header'
import { IntentCard } from '@/components/landing/intent-card'

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

export function LandingContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const router = useRouter()

  function handleSelect(id: string) {
    setSelectedId(id)
    setTimeout(() => {
      router.push('/upload')
    }, 200)
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 pt-12 pb-[calc(var(--safe-area-inset-bottom)+24px)] lg:pt-16">
        <div className="w-full max-w-[640px]">
          {/* Hero */}
          <div className="mb-8 lg:mb-12">
            <p className="text-xs font-ui font-medium text-accent uppercase tracking-[0.15em] mb-3">
              AI product photography
            </p>
            <h1 className="font-display font-semibold text-[40px] leading-[1.05] text-text-primary lg:text-[56px]">
              Your product.
              <br />
              Studio quality.
            </h1>
            <p className="mt-4 text-base font-ui text-text-secondary leading-relaxed lg:text-lg">
              Upload a photo. Choose a style. Done in 30 seconds.
            </p>
          </div>

          {/* Intent cards */}
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-4">
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

          {/* Ghost link — mobile */}
          <div className="mt-8 lg:hidden">
            <button
              type="button"
              className="w-full py-3 text-sm font-ui font-medium text-text-muted text-center transition-colors hover:text-text-secondary active:scale-[0.98]"
            >
              {"See examples \u2192"}
            </button>
          </div>

          {/* CTA — desktop */}
          <div className="hidden lg:block mt-8">
            <button
              type="button"
              className="btn-primary w-full text-base"
            >
              {"Try it free \u2014 no account needed"}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
