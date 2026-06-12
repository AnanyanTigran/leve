const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// TODO: remove when custom domain is configured, revert to cookie-only
const SESSION_STORAGE_KEY = 'leve_session_id'

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
}

// CSRF token — fetched once per page load from GET /api/csrf-token, cached in
// memory. A single in-flight dedup promise prevents concurrent fetches on
// mount. The server binds the token to a signed _csrf cookie so the pair must
// match on every state-mutating request.
let _csrfToken: string | null = null
let _csrfFetch: Promise<string | null> | null = null

async function getCsrfToken(): Promise<string | null> {
  if (_csrfToken) return _csrfToken
  if (_csrfFetch) return _csrfFetch
  _csrfFetch = fetch(apiUrl('/api/csrf-token'), { credentials: 'include' })
    .then(r => (r.ok ? r.json() : null))
    .then((json: { success: boolean; data: { token: string } } | null) => {
      _csrfToken = json?.data?.token ?? null
      _csrfFetch = null
      return _csrfToken
    })
    .catch(() => {
      _csrfFetch = null
      return null
    })
  return _csrfFetch
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  if (MUTATING_METHODS.has(method)) {
    const token = await getCsrfToken()
    if (token) headers.set('x-csrf-token', token)
  }
  // Send stored sessionId as fallback header for mobile Safari (ITP blocks cross-site cookies).
  // TODO: remove when custom domain is configured, revert to cookie-only
  const storedSid = typeof window !== 'undefined' ? localStorage.getItem(SESSION_STORAGE_KEY) : null
  if (storedSid) headers.set('x-session-id', storedSid)
  return fetch(apiUrl(path), { ...options, headers, credentials: 'include' })
}
