'use client'

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface PaywallSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function PaywallSheet({ isOpen, onClose }: PaywallSheetProps) {
  const router = useRouter()

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base rounded-t-lg max-w-[640px] mx-auto"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="w-8 h-1 bg-border-strong rounded-full mx-auto mt-3 mb-4" />

        <div className="px-4 pb-8">
          <h2 className="text-[20px] font-semibold text-text-primary">Unlock HD Download</h2>
          <p className="text-[13px] text-text-muted mt-1">Watermark-free · Full resolution · Yours to keep</p>

          <div className="mt-6 flex flex-col gap-3">
            {/* Trial */}
            <div className="bg-bg-surface border border-border-default rounded-md p-4">
              <p className="text-[16px] font-semibold text-text-primary">5 images</p>
              <p className="text-[26px] font-display font-semibold text-accent mt-1">1,000 ֏</p>
              <p className="text-[12px] text-text-muted">~200 ֏ per image</p>
            </div>

            {/* Volume — pre-selected */}
            <div className="relative bg-bg-surface border-2 border-accent rounded-md p-4 overflow-hidden">
              <span className="absolute top-0 right-0 bg-[#D64C1A] text-white text-[10px] font-semibold px-2 py-1 rounded-bl-[8px] rounded-tr-[12px]">
                BEST VALUE
              </span>
              <p className="text-[16px] font-semibold text-text-primary">15 images</p>
              <p className="text-[26px] font-display font-semibold text-accent mt-1">3,500 ֏</p>
              <p className="text-[12px] text-text-muted">~233 ֏ per image</p>
            </div>

            {/* Pro — locked */}
            <div className="bg-bg-surface border border-border-default rounded-md p-4 opacity-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[16px] font-semibold text-text-primary">Unlimited / month</p>
                  <p className="text-[26px] font-display font-semibold text-text-muted mt-1">10,000 ֏</p>
                </div>
                <Lock className="w-5 h-5 text-text-muted" />
              </div>
              <p className="text-[11px] text-text-muted mt-2">Available after 3 purchases</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => router.push(ROUTES.DOWNLOAD)}
              className="w-full border border-border-default rounded-md h-12 flex items-center justify-between px-4 hover:border-border-strong hover:bg-bg-surface transition-colors"
            >
              <span className="text-[15px] font-semibold text-text-primary">Pay with Idram</span>
              <span className="text-[11px] text-text-muted">Most popular in Armenia</span>
            </button>
            <button
              onClick={() => router.push(ROUTES.DOWNLOAD)}
              className="w-full border border-border-default rounded-md h-12 flex items-center justify-between px-4 hover:border-border-strong hover:bg-bg-surface transition-colors"
            >
              <span className="text-[15px] font-semibold text-text-primary">Pay with Telcell</span>
              <span className="text-[11px] text-text-muted">Wallet</span>
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-text-muted">
            Secure payment · AMD only · No subscription risk
          </p>
        </div>
      </div>
    </>
  )
}
