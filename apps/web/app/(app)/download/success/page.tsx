'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'

export default function DownloadSuccessPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="max-w-[640px] mx-auto px-4 py-8">
        {/* Generated image placeholder */}
        <div
          className="relative w-full aspect-[4/5] rounded-[16px] overflow-hidden border border-border-default"
          style={{ background: 'linear-gradient(135deg, #fdf0eb, #f5d5c5)' }}
        >
          <span className="absolute top-3 right-3 bg-[#D64C1A] text-white text-[11px] font-semibold px-2 py-1 rounded-md">
            HD
          </span>
        </div>

        <div className="mt-6">
          <h1 className="text-[24px] font-display font-semibold text-text-primary">Your image is ready</h1>
          <p className="text-[14px] text-text-muted mt-1">Full resolution · No watermark</p>
        </div>

        <button className="btn-primary w-full h-14 text-[16px] mt-6 gap-2">
          <Download className="w-[18px] h-[18px]" />
          Download HD image
        </button>

        {/* Optional divider */}
        <div className="flex items-center gap-3 mt-8 mb-6">
          <hr className="flex-1 border-border-default" />
          <span className="text-[12px] text-text-muted">Optional</span>
          <hr className="flex-1 border-border-default" />
        </div>

        {/* Phone capture card */}
        <div className="bg-bg-surface border border-border-default rounded-md p-5">
          <p className="text-[16px] font-semibold text-text-primary">Save your work</p>
          <p className="text-[14px] text-text-secondary mt-1">Access your images from any device</p>

          <div className="mt-4 flex items-center h-12 bg-bg-elevated border border-border-default rounded-[10px] overflow-hidden">
            <span className="px-3 text-[14px] text-text-muted border-r border-border-default h-full flex items-center shrink-0">
              +374
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="77 123 456"
              className="flex-1 px-3 text-[14px] text-text-primary bg-transparent outline-none placeholder:text-text-muted"
            />
          </div>

          <button className="btn-secondary w-full mt-3">Send code</button>
          <p className="text-[11px] text-text-muted text-center mt-2">
            We&apos;ll never spam you · Only for session recovery
          </p>
        </div>

        <button className="block w-full text-center text-[14px] text-text-muted hover:text-text-secondary mt-4 cursor-pointer transition-colors">
          Skip for now
        </button>
        <button
          onClick={() => router.push('/')}
          className="block w-full text-center text-[14px] text-accent font-semibold mt-3 cursor-pointer"
        >
          Generate another →
        </button>
      </div>
    </div>
  )
}
