'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'

function captureReturnTo() {
  if (typeof window === 'undefined') return
  // Persist the current URL so /register can bounce the user back here
  // after re-verifying instead of dumping them on /templates.
  const path = window.location.pathname + window.location.search
  if (path && path !== '/register') {
    sessionStorage.setItem('leve_return_to', path)
  }
}

export function useVerifiedGuard() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch('/api/session/me', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.isVerified) {
          setIsVerified(true)
        } else {
          captureReturnTo()
          router.replace('/register')
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          captureReturnTo()
          router.replace('/register')
        }
      })
      .finally(() => setChecked(true))

    return () => controller.abort()
  }, [router])

  return { checked, isVerified }
}
