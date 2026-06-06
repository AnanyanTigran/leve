const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// TODO: remove when custom domain is configured, revert to cookie-only
const SESSION_STORAGE_KEY = 'leve_session_id'

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_STORAGE_KEY)
}

export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
}

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const sessionId = getStoredSessionId()
  const headers = new Headers(options.headers)
  if (sessionId) {
    headers.set('X-Session-Id', sessionId) // TODO: remove when custom domain is configured
  }
  return fetch(apiUrl(path), { ...options, headers, credentials: 'include' })
}
