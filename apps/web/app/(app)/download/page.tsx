'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

export default function DownloadPage() {
  const router = useRouter()

  useEffect(() => {
    apiFetch('/api/session/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.data?.isVerified) {
          router.replace('/')
          return
        }
        const jobId = sessionStorage.getItem('leve_job_id')
        if (jobId) {
          router.replace('/download/success')
        } else {
          router.replace('/history')
        }
      })
      .catch(() => router.replace('/'))
  }, [router])

  return (
    <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
}
