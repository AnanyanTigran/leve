'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, ImageIcon } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { BottomNav } from '@/components/shared/bottom-nav'
import { isVerified } from '@/lib/session'

export default function HistoryPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isVerified()) router.replace('/register')
  }, [router])

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      <AppHeader variant="app" showBack={false} title="Your designs" rightSlot={null} />

      {/* Phone capture banner */}
      <div className="page-content">
        <div className="mt-4 bg-accent-subtle border border-accent-border rounded-[10px] p-4 flex items-start gap-3">
          <Phone className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] text-text-primary">
              Add your phone number to access designs from any device
            </p>
            <button className="text-[12px] text-accent font-semibold mt-1">Add phone →</button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <main className="page-content flex-1 pb-24">
        <div className="flex flex-col items-center justify-center min-h-[400px] pb-20 gap-4">
          <ImageIcon className="w-12 h-12 text-border-strong" />
          <p className="text-[16px] font-semibold text-text-primary">No designs yet</p>
          <p className="text-[14px] text-text-muted text-center">
            Your generated designs will appear here
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary btn-full mt-4"
          >
            Generate your first image
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
