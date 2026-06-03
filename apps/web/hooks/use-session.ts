'use client'

import { useEffect, useState } from 'react'

export interface SessionData {
  isVerified: boolean
  creditsRemaining: number
  isPaid: boolean
  purchaseCount: number
  phone: string | null
  email: string | null
  brandName: string | null
  favoriteSceneId: string | null
  anonGenerationsUsed: number
  anonGenerationsLimit: number
  anonLimitReached: boolean
  dailyGenerationsUsed: number
  softCapReached: boolean
  showSubscriptionOffer: boolean
}

type Status = 'idle' | 'loading' | 'ready' | 'error'
type View = { data: SessionData | null; status: Status }

let view: View = { data: null, status: 'idle' }
let inflight: Promise<SessionData | null> | null = null
const subscribers = new Set<(v: View) => void>()

function setView(next: View) {
  view = next
  subscribers.forEach((fn) => fn(next))
}

export async function refreshSession(): Promise<SessionData | null> {
  if (inflight) return inflight
  if (view.status !== 'ready') setView({ ...view, status: 'loading' })
  inflight = (async () => {
    try {
      const res = await fetch('/api/session/me', { credentials: 'include' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setView({ data: view.data, status: 'error' })
        return null
      }
      const data = json.data as SessionData
      setView({ data, status: 'ready' })
      return data
    } catch {
      setView({ data: view.data, status: 'error' })
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function useSession() {
  const [local, setLocal] = useState<View>(view)

  useEffect(() => {
    const sub = (next: View) => setLocal(next)
    subscribers.add(sub)
    if (view.status === 'idle') {
      void refreshSession()
    } else {
      setLocal(view)
    }
    return () => {
      subscribers.delete(sub)
    }
  }, [])

  return { session: local.data, status: local.status, mutate: refreshSession }
}
