'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaywallState = 'pricing' | 'processing' | 'success' | 'failed'

interface PaywallSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function PaywallSheet({ isOpen, onClose }: PaywallSheetProps) {
  const router = useRouter()
  const [paywallState, setPaywallState] = useState<PaywallState>('pricing')
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'volume'>('volume')

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setPaywallState('pricing'), 350)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (paywallState !== 'processing') return
    const t = setTimeout(() => setPaywallState('success'), 2500)
    return () => clearTimeout(t)
  }, [paywallState])

  function handlePayment() {
    setPaywallState('processing')
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={paywallState === 'pricing' ? onClose : undefined}
        />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base rounded-t-[20px] max-w-[640px] mx-auto"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="w-8 h-1 bg-border-strong rounded-full mx-auto mt-3 mb-4" />

        {paywallState === 'pricing' && (
          <div className="px-4 pb-8">
            <h2 className="text-[20px] font-semibold text-text-primary">Unlock HD Download</h2>
            <p className="text-[13px] text-text-muted mt-1">
              Watermark-free · Full resolution · Yours to keep
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {/* Trial */}
              <button
                onClick={() => setSelectedPlan('trial')}
                className={cn(
                  'bg-bg-surface border rounded-md p-4 text-left transition-all',
                  selectedPlan === 'trial'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border-default'
                )}
              >
                <p className="text-[16px] font-semibold text-text-primary">5 images</p>
                <p className="text-[26px] font-display font-semibold text-accent mt-1">1,000 ֏</p>
                <p className="text-[12px] text-text-muted">~200 ֏ per image</p>
              </button>

              {/* Volume — default selected */}
              <button
                onClick={() => setSelectedPlan('volume')}
                className={cn(
                  'relative bg-bg-surface border-2 rounded-md p-4 overflow-hidden text-left transition-all',
                  selectedPlan === 'volume'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-accent'
                )}
              >
                <span className="absolute top-0 right-0 bg-[#D64C1A] text-white text-[10px] font-semibold px-2 py-1 rounded-bl-[8px] rounded-tr-[12px]">
                  BEST VALUE
                </span>
                <p className="text-[16px] font-semibold text-text-primary">15 images</p>
                <p className="text-[26px] font-display font-semibold text-accent mt-1">3,500 ֏</p>
                <p className="text-[12px] text-text-muted">~233 ֏ per image</p>
              </button>

              {/* Pro — locked */}
              <div className="bg-bg-surface border border-border-default rounded-md p-4 opacity-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[16px] font-semibold text-text-primary">Unlimited / month</p>
                    <p className="text-[26px] font-display font-semibold text-text-muted mt-1">
                      10,000 ֏
                    </p>
                  </div>
                  <Lock className="w-5 h-5 text-text-muted" />
                </div>
                <p className="text-[11px] text-text-muted mt-2">Available after 3 purchases</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handlePayment}
                className="w-full border border-border-default rounded-md h-12 flex items-center justify-between px-4 hover:border-border-strong hover:bg-bg-surface transition-colors"
              >
                <span className="text-[15px] font-semibold text-text-primary">Pay with Idram</span>
                <span className="text-[11px] text-text-muted">Most popular in Armenia</span>
              </button>
              <button
                onClick={handlePayment}
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
        )}

        {paywallState === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-5 px-4 pb-8">
            <div className="w-16 h-16 rounded-full border-4 border-bg-elevated border-t-accent animate-spin" />
            <div className="text-center">
              <p className="text-[16px] font-semibold text-text-primary">Processing payment...</p>
              <p className="text-[13px] text-text-muted mt-1">Complete in the Idram app</p>
              <p className="text-[12px] text-text-muted mt-1">Don&apos;t close this screen</p>
            </div>
          </div>
        )}

        {paywallState === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 gap-5 px-4 pb-8">
            <div
              className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center"
              style={{ animation: 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
            >
              <CheckCircle size={32} className="text-[#16A34A]" />
            </div>
            <div className="text-center">
              <p className="text-[18px] font-semibold text-text-primary">Payment confirmed!</p>
              <p className="text-[14px] text-text-secondary mt-1">Your HD image is ready</p>
            </div>
            <button
              className="btn-primary mt-2"
              onClick={() => {
                onClose()
                router.push('/download/success')
              }}
            >
              Download HD image
            </button>
          </div>
        )}

        {paywallState === 'failed' && (
          <div className="flex flex-col items-center justify-center py-12 gap-5 px-4 pb-8">
            <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <XCircle size={32} className="text-[#DC2626]" />
            </div>
            <div className="text-center">
              <p className="text-[18px] font-semibold text-text-primary">Payment not completed</p>
              <p className="text-[14px] text-text-secondary mt-1">
                Your designs are saved for 24 hours
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button className="btn-primary" onClick={() => setPaywallState('pricing')}>
                Try again
              </button>
              <button className="btn-secondary" onClick={() => setPaywallState('pricing')}>
                Choose different method
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
