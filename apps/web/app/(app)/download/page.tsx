'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

type PaymentStatus = 'processing' | 'success' | 'failed'

const springStyle = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)'

export default function DownloadPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PaymentStatus>('processing')
  const [iconScaled, setIconScaled] = useState(false)

  useEffect(() => {
    if (status !== 'processing') return
    const t = setTimeout(() => setStatus('success'), 3000)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    setIconScaled(false)
    if (status === 'processing') return
    let rafId = 0
    const outer = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => setIconScaled(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(rafId)
    }
  }, [status])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base px-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-[640px]">

        {status === 'processing' && (
          <>
            <div className="w-20 h-20 rounded-full border-4 border-bg-elevated border-t-accent animate-spin" />
            <div className="text-center">
              <p className="text-[20px] font-semibold text-text-primary">Processing payment...</p>
              <p className="text-[14px] text-text-secondary mt-2">Complete your payment in the Idram app</p>
              <p className="text-[13px] text-text-muted mt-1">Don&apos;t close this screen</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center"
              style={{ transform: iconScaled ? 'scale(1)' : 'scale(0)', transition: springStyle }}
            >
              <CheckCircle className="w-10 h-10 text-[#16A34A]" />
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-text-primary">Payment confirmed!</p>
              <p className="text-[14px] text-text-secondary mt-2">Your HD image is ready to download</p>
            </div>
            <button
              onClick={() => router.push(`${ROUTES.DOWNLOAD}/success`)}
              className="btn-primary w-full max-w-[320px]"
            >
              Download HD image
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div
              className="w-20 h-20 rounded-full bg-[#FEF2F2] flex items-center justify-center"
              style={{ transform: iconScaled ? 'scale(1)' : 'scale(0)', transition: springStyle }}
            >
              <XCircle className="w-10 h-10 text-[#DC2626]" />
            </div>
            <div className="text-center">
              <p className="text-[20px] font-semibold text-text-primary">Payment was not completed</p>
              <p className="text-[14px] text-text-secondary mt-2">Your designs are saved for 24 hours</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-[320px]">
              <button onClick={() => setStatus('processing')} className="btn-primary w-full">
                Try again
              </button>
              <button onClick={() => router.back()} className="btn-secondary w-full">
                Choose different method
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
