'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/shared/app-header'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { VariantGrid } from '@/components/results/variant-grid'
import { TextOverlaySection } from '@/components/results/text-overlay-section'
import { PaywallSheet } from '@/components/results/paywall-sheet'

const VARIANT_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #fdf0eb, #f5d5c5)',
  2: 'linear-gradient(135deg, #f5e6d3, #e8c9a8)',
  3: 'linear-gradient(135deg, #fef9f0, #fdecd5)',
  4: 'linear-gradient(135deg, #f8e8d8, #f0cdb0)',
}

export default function ResultsPage() {
  const [selectedVariant, setSelectedVariant] = useState(1)
  const [paywallOpen, setPaywallOpen] = useState(false)

  const afterGradient = VARIANT_GRADIENTS[selectedVariant] ?? VARIANT_GRADIENTS[1]

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <AppHeader
        variant="app"
        showBack={false}
        title="Your results"
        rightSlot={
          <button className="text-[13px] text-accent font-ui font-semibold">
            Share
          </button>
        }
      />

      {/* Main scrollable content — padded to clear both fixed bars */}
      <main className="flex-1 pb-[136px]">
        <div className="max-w-[640px] mx-auto px-4 py-4 flex flex-col gap-4">
          <BeforeAfterSlider afterGradient={afterGradient} />
          <VariantGrid selectedId={selectedVariant} onSelect={setSelectedVariant} />
          <TextOverlaySection />
        </div>
      </main>

      {/* Paywall bar — fixed above BottomNav (h-16 = 64px) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-bg-base border-t border-border-default px-4 py-3">
        <div className="max-w-[640px] mx-auto flex items-center justify-between">
          <span className="text-[12px] text-text-muted">2 free previews remaining</span>
          <button onClick={() => setPaywallOpen(true)} className="btn-primary px-6">
            Unlock HD
          </button>
        </div>
      </div>

      <BottomNav />
      <PaywallSheet isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
