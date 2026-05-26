'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useVerifiedGuard() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    fetch('/api/session/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.isVerified) {
          setIsVerified(true)
        } else {
          router.replace('/register')
        }
      })
      .catch(() => router.replace('/register'))
      .finally(() => setChecked(true))
  }, [router])

  return { checked, isVerified }
}
