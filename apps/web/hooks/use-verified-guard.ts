'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useVerifiedGuard() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/session/me', { credentials: 'include', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.isVerified) {
          setIsVerified(true)
        } else {
          router.replace('/register')
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') router.replace('/register')
      })
      .finally(() => setChecked(true))

    return () => controller.abort()
  }, [router])

  return { checked, isVerified }
}
