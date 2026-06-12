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

// TODO(LOW infra-audit 2.3): logout call sites (user-menu, nav-bottom-sheet)
// never clear the stored session ID, so the dead x-session-id keeps being
// sent and each request mints a throwaway anon session until /session/me
// re-stores a fresh one. Export a clearStoredSessionId() and call it there.

// CSRF token — fetched from GET /api/csrf-token, cached in memory. A single
// in-flight dedup promise prevents concurrent fetches on mount. The token is
// stored server-side in Redis (24h TTL) and validated via the x-csrf-token
// header; no cookie is involved. If the server rejects a request with
// csrf_missing/csrf_invalid (expired token, Redis flush, failed initial
// fetch), apiFetch refetches the token and retries once.
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

function invalidateCsrfToken(): void {
  _csrfToken = null
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const CSRF_ERRORS = new Set(['csrf_missing', 'csrf_invalid'])

// TODO(LOW infra-audit 4.9): handle 429 centrally — the server now returns
// retryAfterSeconds in the body and exposes the Retry-After header via CORS,
// but only use-generate.ts surfaces it; everything else shows a generic error.
// TODO: [UX] surface retryAfterSeconds in the rate-limit copy ("try again in
// N minutes") instead of the static "wait an hour" / "wait a few minutes".

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase()
  const isMutating = MUTATING_METHODS.has(method)

  const doFetch = async (): Promise<Response> => {
    const headers = new Headers(options.headers)
    if (isMutating) {
      const token = await getCsrfToken()
      if (token) headers.set('x-csrf-token', token)
    }
    // Send stored sessionId as fallback header for mobile Safari (ITP blocks cross-site cookies).
    // TODO: remove when custom domain is configured, revert to cookie-only
    const storedSid = typeof window !== 'undefined' ? localStorage.getItem(SESSION_STORAGE_KEY) : null
    if (storedSid) headers.set('x-session-id', storedSid)
    return fetch(apiUrl(path), { ...options, headers, credentials: 'include' })
  }

  let res = await doFetch()

  // CSRF recovery: a 403 with a csrf error means the cached token expired
  // server-side (or the initial fetch failed and the request went out
  // tokenless). Drop the cache, fetch a fresh token, retry exactly once.
  if (isMutating && res.status === 403) {
    const body = (await res
      .clone()
      .json()
      .catch(() => null)) as { error?: string } | null
    if (body?.error && CSRF_ERRORS.has(body.error)) {
      invalidateCsrfToken()
      res = await doFetch()
    }
  }

  return res
}
