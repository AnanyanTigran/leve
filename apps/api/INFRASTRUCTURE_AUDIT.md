# Infrastructure Audit — Request-Handling Layer

**Date:** 2026-06-12
**Scope:** Everything that touches a request before route business logic, plus cross-cutting route behavior: plugin/hook ordering, session resolution, CSRF, rate limiting, error handling, CORS, cookies, and missing infrastructure.
**Topology assumed:** Browser → `leve-rho.vercel.app` (Next.js) → cross-origin fetch → Railway edge proxy → Fastify (`trustProxy` enabled). No custom domain, so all cookies are third-party from the browser's perspective.

Severity legend: **CRITICAL** = actively breaking real users or exploitable now. **HIGH** = will break users under realistic conditions (carrier NAT, Safari, long sessions) or leaks/exposes something it shouldn't. **MEDIUM/LOW** = correctness or robustness gaps with workarounds.

Status legend: ✅ fixed in this commit · 📝 TODO comment added in code · 📋 documented only (no code change needed / needs ops action).

---

## 1. Plugin Registration Order and Hook Execution

Registration order in `src/index.ts` (before fix): `cors` → `helmet` → `multipart` → `rate-limit` → `cookie` → `formbody` → CSRF `preHandler` hook → auth decorators → routes.

### 1.1 ✅ CRITICAL — Rate limit hook runs before cookie parsing, so session-keyed limiters silently degrade to IP keys

- **File:** `src/index.ts:81–86` (registration order)
- **Issue:** `@fastify/rate-limit` and `@fastify/cookie` both install `onRequest` hooks, and Fastify executes hooks in registration order. `rate-limit` was registered *before* `cookie`, so every rate-limit `keyGenerator` executes while `request.cookies` is still unpopulated. `otpVerifyKeyGenerator` (`routes/register/otp.ts`) reads `request.cookies[SESSION_COOKIE_NAME]`, always gets `undefined`, and falls back to the IP key.
- **Impact:** This silently re-introduces the exact incident commit `be6774a` tried to fix ("OTP verify 429 caused by rate limit key resolving to shared proxy IP"). The session-keyed OTP verify limiter never actually keyed by session in production — all users behind one carrier NAT IP shared a 10-attempts/15-min budget.
- **Fix:** `@fastify/cookie` is now registered before `@fastify/rate-limit`.

### 1.2 ✅ HIGH — `trustProxy: true` makes `request.ip` spoofable via X-Forwarded-For prefix injection

- **File:** `src/index.ts:44`
- **Issue:** `trustProxy: true` trusts *every* hop in `X-Forwarded-For`. Railway's edge proxy appends the real client IP to whatever XFF header the client sends, so a client that sends `X-Forwarded-For: 1.2.3.4` gets `request.ip = 1.2.3.4` (leftmost entry wins when all hops are trusted).
- **Impact:** Every IP-keyed control is bypassable by rotating a forged XFF prefix: the global rate limit, the OTP per-IP send limit, the anonymous per-IP generation limit (= unlimited free $0.04 fal.ai calls), webhook rate limits, and the fraud `ipAddress` recorded on payment transactions.
- **Fix:** Changed to `trustProxy: 1` — trust exactly the one Railway proxy hop, so `request.ip` is the rightmost XFF entry, the one Railway itself appended. **Deploy verification required:** after deploy, confirm `request.ip` in logs shows distinct real client IPs and not a single shared Railway-internal IP. If Railway ever adds a second proxy hop, this value must become `2`.

### 1.3 📋 OK — CSRF hook ordering relative to auth and body parsing

The CSRF `preHandler` hook runs before route-level `preHandler` arrays (auth decorators). This is correct for the current design: the token is not session-bound, so it needs nothing from the session. Body parsing also completes before `preHandler`, so the hook ordering is sound. No change.

### 1.4 📝 MEDIUM — Global rate limiter uses in-memory store

- **File:** `src/index.ts` (rate-limit registration)
- **Issue:** No `redis` option passed to `@fastify/rate-limit`, so counters live in process memory: they reset on every deploy/restart and are per-instance if Railway ever scales horizontally.
- **Impact:** Limits are weaker than configured after restarts and inconsistent across replicas. TODO comment added; pass the existing ioredis connection to the plugin.

---

## 2. Session Resolution

Four decorators in `src/middleware/auth.ts`. The client (`apps/web/lib/api-client.ts`) sends the session ID two ways on every request: the `leve_sid` cookie (when the browser stores it) and an `x-session-id` header from localStorage (the mobile-Safari fallback, populated by `useSession` from `/api/session/me`).

### 2.1 ✅ CRITICAL — `requireSession` and `requireVerified` ignore the `x-session-id` header fallback

- **File:** `src/middleware/auth.ts:19, 32` (before fix)
- **Issue:** Only `requireSessionOrAnon` implemented the cookie → header fallback. `requireSession` (used by **POST /api/register/otp/verify**) and `requireVerified` (used by **all download/export/spend-credit routes** and session preferences) read only the cookie.
- **Impact:** On mobile Safari (ITP blocks all cross-site cookies, and this deployment is cross-origin with no custom domain) the cookie is never stored. Result: a Safari user can request an OTP (`/send` uses `requireSessionOrAnon` → header works) but **cannot verify it** (`/verify` → 401 `no_session`), and a verified, *paying* Safari user **cannot download the image they paid for** (all `requireVerified` routes → 401). This also explains the incident pattern "one route works while a sibling route fails in the same page session."
- **Fix:** Extracted a single `resolveSessionId()` (cookie first, then `x-session-id` header) used by all four decorators.

### 2.2 📝 MEDIUM — `requireVerifiedOrAnon` is dead code with a misleading name

- **File:** `src/middleware/auth.ts:85`
- **Issue:** Not referenced by any route. Despite the `OrAnon` suffix it does **not** auto-create an anonymous session — it behaves exactly like `requireSession`. If someone wires it to a route expecting `requireSessionOrAnon` semantics, anonymous flows break.
- **Impact:** Latent foot-gun. TODO added: delete it or rename/implement to match its name.

### 2.3 📝 LOW — Logout doesn't clear the localStorage session ID

- **File:** `apps/web/lib/api-client.ts` / `components/shared/user-menu.tsx`
- **Issue:** `POST /api/session/logout` deletes the Redis session and clears the cookie, but the client keeps `leve_session_id` in localStorage and continues sending it as `x-session-id`. The stale ID resolves to nothing (session deleted), so each subsequent request mints a fresh anonymous session until `/session/me` re-stores the new ID.
- **Impact:** Harmless data-wise but generates churn sessions. TODO added in `api-client.ts` (export and call a `clearStoredSessionId()` from logout call sites).

### 2.4 📋 Decorator-to-route mapping reviewed — correct

- `requireSessionOrAnon`: upload, generate preview/status, overlay, payments intent/status, download check/preview-url, session me/logout — correct (anonymous flows allowed by design).
- `requireVerified`: download url/file/export/export-file/proxy/spend-credit, session history, brand-name, favorite-scene — correct (post-OTP features).
- `requireSession` on OTP verify — correct (session must already exist from the send step; auto-creating here would verify into a throwaway session).

---

## 3. CSRF

Current design (post-refactor): `GET /api/csrf-token` mints `nanoid(32)`, stores `csrf:<token>` in Redis, returns it in the body; SPA caches it in memory and sends `x-csrf-token` on mutating requests; a global `preHandler` hook checks `redis.exists`. No cookies involved — correct call for this cross-origin/ITP topology.

### 3.1 ✅ HIGH — OTP routes excluded from CSRF + global formbody parser = login-CSRF vector

- **File:** `src/index.ts:94` (`CSRF_EXCLUDED = ['/api/webhooks/', '/api/register/otp/']`)
- **Issue:** `@fastify/formbody` is registered globally, so the API parses `application/x-www-form-urlencoded` bodies — which browsers send cross-site from a plain `<form>` **without any CORS preflight**. The session cookie is `SameSite=None`, so it rides along. With `/api/register/otp/` excluded from CSRF, an attacker page could auto-submit a form to `/api/register/otp/send` + `/verify` and **verify the attacker's own phone/email onto the victim's session** (login CSRF / session fixation): the victim's subsequent purchases and credits land on the attacker's User record.
- **Impact:** Account-takeover-shaped fraud vector, exploitable from any malicious web page against Chrome/Android users (where the SameSite=None cookie is stored).
- **Fix:** Removed `/api/register/otp/` from the exclusion list. Safe because the SPA already sends `x-csrf-token` on these calls (`otp-form.tsx` uses `apiFetch`), and the client now self-heals on token expiry (3.2). `/api/webhooks/` stays excluded — webhooks are server-to-server, can't fetch a token, and are authenticated by HMAC signature instead.

### 3.2 ✅ HIGH — Client never recovers from an expired/missing CSRF token

- **Files:** `apps/web/lib/api-client.ts:19–47`, `src/index.ts:151`
- **Issue:** The SPA caches the token in memory forever; Redis TTL was 2 h. A tab left open longer than 2 h (or a Redis flush, or a failed initial token fetch — `apiFetch` proceeds *without* a token when `getCsrfToken()` returns null) makes **every subsequent mutation 403** (`csrf_invalid`/`csrf_missing`) with no recovery path. This is the most likely root cause of the "generate 403 after CSRF refactor" incident class.
- **Impact:** Hard-broken sessions for long-lived tabs; user-visible generic errors on generate/payment.
- **Fix:** (a) `apiFetch` now detects a 403 with `csrf_missing`/`csrf_invalid`, drops the cached token, fetches a fresh one, and retries the request once. (b) Server token TTL raised from 2 h to 24 h. Also corrected the stale comment claiming a `_csrf` cookie pairing that no longer exists.

### 3.3 ✅ HIGH — `GET /api/csrf-token` is unauthenticated and unmetered: Redis-fill DoS

- **File:** `src/index.ts:149`
- **Issue:** Anyone can mint tokens in a loop; each writes a Redis key with (now) a 24 h TTL. Sustained abuse fills Redis — and Redis also holds **sessions and credit balances**, so memory-pressure eviction is a data-loss event, not just a slowdown.
- **Impact:** Cheap remote DoS against the most stateful component of the system.
- **Fix:** Per-IP route rate limit added (120/min — generous because each real page load fetches exactly one token and carrier NAT aggregates many users per IP).

### 3.4 📝 MEDIUM — Token is not bound to a session

- **File:** `src/index.ts` (CSRF hook)
- **Issue:** Any token in Redis validates any request from anyone. The real protection is the custom-header requirement itself (cross-origin pages can't set `x-csrf-token` without a preflight that CORS rejects), so this is defense-in-depth, not a hole.
- **Impact:** A leaked token is valid for all users for 24 h. TODO added: store the sessionId as the key's value and compare it to the resolved session on validation.

### 3.5 📋 Verified correct — token reuse semantics and exclusion completeness

- Validation uses `EXISTS` (reusable), matching the SPA's cache-once-use-many pattern. The historical "upload worked, generate failed with the identical token" incident is consistent with a previous consume-on-use (`GETDEL`) implementation; the current code does not have that bug.
- Exclusion list reviewed against the full route table: webhooks are the only routes that genuinely cannot send a token. Nothing else should be (or now is) excluded. `GET`/`HEAD`/`OPTIONS` bypass is correct.

---

## 4. Rate Limiting

Full inventory and verdicts. The recurring theme: **Armenian mobile carriers NAT thousands of users behind a handful of public IPs** — any per-IP threshold sized for "one household" will 429 real users.

| # | Limiter | Key | Threshold (before) | Verdict |
|---|---------|-----|--------------------|---------|
| 1 | Global `@fastify/rate-limit` | IP | 100/min | ✅ raised to 300/min (4.1) |
| 2 | OTP send (route config) | IP | 5/min | ✅ re-keyed to session (4.2) |
| 3 | OTP verify (route config) | session cookie → IP | 10/15min | ✅ fixed by 1.1 + header fallback (4.2) |
| 4 | OTP send per identifier (service) | phone/email | 3/hr | 📋 correct as-is |
| 5 | OTP send per IP (service) | IP | 10/hr | ✅ raised to 30/hr (4.3) |
| 6 | Upload (custom Redis) | sessionId | 10 anon / 50 verified per hr | 📋 correct; Retry-After added (4.5) |
| 7 | Anonymous generation (custom Redis) | IP | 10/day | ✅ raised to 50/day (4.4) |
| 8 | Generate preview burst | — | none | ✅ added 10/min per session (8.2) |
| 9 | Webhooks (route config) | IP | 30/min | 📋 correct (fixed provider IPs) |
| 10 | Download routes (route config) | IP (plugin default) | 30/min | 📝 TODO re-key to session (4.6) |

### 4.1 ✅ HIGH — Global 100/min per IP is below real polling traffic for NAT'd users

- **File:** `src/index.ts:81–84`
- **Issue:** During generation the FE polls `/api/generate/status/:jobId` every 1–2 s (~30–40 req/min per active user) plus `/session/me`, preview URLs, etc. Two to three concurrent users behind one carrier NAT IP exceed 100/min during *normal* use.
- **Impact:** Random 429s for legitimate users that correlate with marketing pushes (more concurrent users per carrier IP) — the worst possible failure mode for conversion.
- **Fix:** Raised to 300/min. Kept IP keying — the global limiter is the unauthenticated-flood backstop, and keying it on a client-controlled `x-session-id` header would let attackers rotate keys to bypass it. Also added an `errorResponseBuilder` so plugin 429s use the standard `{ success, error, requestId }` envelope with `retryAfterSeconds` (clients previously got Fastify's default shape, inconsistent with every other route).

### 4.2 ✅ HIGH — OTP route limiters keyed by IP / cookie-only session

- **File:** `src/routes/register/otp.ts:21–31`
- **Issue:** The send route was keyed purely by IP (5/min shared across a whole NAT), and the verify route's session key never worked (finding 1.1) and had no `x-session-id` fallback — so mobile Safari users were always IP-keyed even after the ordering fix.
- **Impact:** OTP 429s for real users on shared IPs — the exact incident in the brief.
- **Fix:** Both routes now use a shared `sessionOrIpKey()` generator (cookie → `x-session-id` header → IP) from `lib/rate-limit.ts`. Brute-force safety is preserved by the per-identifier service limit (3 sends/hr) and the per-record 5-attempt cap in `verifyOtp` — those are keyed on things an attacker can't rotate.

### 4.3 ✅ HIGH — Service-level OTP IP limit 10 sends/hour per IP

- **File:** `src/services/otp.service.ts:19`
- **Issue:** 4–5 users registering behind one carrier IP in the same hour (2–3 sends each with resends) exhausts it; worse, the route returns 200 (anti-enumeration), so the user just never receives the code — indistinguishable from SMS delivery failure.
- **Impact:** Silent registration failure under NAT. The hardest incident type to debug, and it already happened once.
- **Fix:** Raised to 30/hr. The per-identifier limit (3/hr) remains the real per-user guard; the IP limit is only an SMS-cost backstop against bulk abuse.

### 4.4 ✅ HIGH — Anonymous generation cap 10/day per IP blocks the free-trial funnel under NAT

- **File:** `src/lib/rate-limit.ts:32`
- **Issue:** Each anonymous user gets 2 free generations; 10/day per IP = exactly 5 users per carrier IP per day. Everyone after that gets 429 before ever seeing the product's core promise.
- **Impact:** Direct top-of-funnel loss, invisible in error dashboards (it looks like intended rate limiting). Cost exposure of raising it: 50/day × $0.04 = $2/day per hostile IP, and the per-session cap (2) plus XFF fix (1.2) still bound it.
- **Fix:** Raised to 50/day.

### 4.5 ✅ HIGH — Custom 429 responses had no Retry-After, and the browser couldn't read it anyway

- **Files:** `src/routes/upload/index.ts:30`, `src/routes/generate/index.ts:74`, CORS config
- **Issue:** The custom Redis limiters returned bare 429s with no `Retry-After` header and no machine-readable wait hint. Additionally, the CORS config had no `exposedHeaders`, so even the plugin's `retry-after`/`x-ratelimit-*` headers were invisible to cross-origin JS.
- **Impact:** The client cannot distinguish "wait 30 s" from "wait until tomorrow"; `use-generate.ts` handles 429 but can only show a generic message.
- **Fix:** `checkRateLimit`/`checkAnonIpGenerationLimit` now return `{ allowed, retryAfterSeconds }` (from the key's actual TTL); upload and generate set `Retry-After` and include `retryAfterSeconds` in the body. CORS now exposes `retry-after` and the `x-ratelimit-*` headers.

### 4.6 📝 MEDIUM — Download routes use the plugin's default IP key

- **File:** `src/routes/download/index.ts` (all `config.rateLimit` blocks)
- **Issue:** 30/min per *IP* is shared across all NAT'd users; these routes are already session-authenticated, so the session is the correct key. TODO added.

### 4.7 📝 MEDIUM — `INCR`-then-`EXPIRE` is not atomic

- **File:** `src/lib/rate-limit.ts`, `src/services/otp.service.ts:64–75`
- **Issue:** If the process dies between `INCR` (count = 1) and `EXPIRE`, the key lives forever with no TTL → that session/IP/identifier is rate-limited permanently once it crosses the threshold.
- **Impact:** Rare but unrecoverable-without-ops lockout. TODO added (single Lua script, mirroring how `session.service.ts` already does atomic ops).

### 4.8 📋 Layer interaction reviewed

A generate-preview request now traverses: global 300/min (IP) → route 10/min (session) → anon-IP 50/day → per-session anon cap (2 lifetime). These are strictly nested (broadest backstop → narrowest business rule) and each returns a distinguishable error (`rate_limit_exceeded` vs `errorCode: ip_generation_limit` vs `otp_required`/`anon_limit_reached`), so no layer masks another. OTP verify: global (IP) + route 10/15min (session) + 5 attempts per OTP record — same nesting, no conflict.

### 4.9 📝 LOW — Client treats most 429s as generic errors

- **File:** `apps/web/lib/api-client.ts`
- Only `use-generate.ts` special-cases 429. TODO added in `api-client.ts` to surface `retryAfterSeconds` centrally now that the server provides it.

---

## 5. Error Handling and Information Leakage

### 5.1 ✅ HIGH — No global error handler: Fastify's default leaks internal error messages

- **File:** `src/index.ts` (absent `setErrorHandler`)
- **Issue:** Fastify's default error handler puts `error.message` in the 500 response body. Several handlers have unwrapped awaits — e.g. `generate/index.ts` awaits `translateToEnglish`, `prisma.generationJob.create`, and `previewQueue.add` with no try/catch — so a Prisma/Redis/AWS failure returns its raw message to the browser (these can include hostnames, table/column names, and AWS request metadata). Errors also weren't reaching Sentry.
- **Impact:** Implementation detail disclosure to any client able to trigger a backend error; blind spots in error monitoring.
- **Fix:** Added `setErrorHandler` that logs the full error server-side, captures 5xx to Sentry, and returns only the standard envelope with a generic code (`internal_error`, `invalid_input` for schema/validation errors, `payload_too_large` for 413, `bad_request` otherwise) plus `requestId: request.id`. Also added `setNotFoundHandler` so unknown routes return the same envelope instead of Fastify's default shape.

### 5.2 📋 MEDIUM — Error envelope inconsistencies (documented, partially normalized)

- Most routes return `{ success: false, error, requestId }`. `generate/index.ts` adds `errorCode` for FE branching (`ip_generation_limit`, `anon_limit_reached`) — acceptable as an *additive* field; documented as the convention: `error` = stable machine code, `errorCode` = optional finer-grained reason.
- Auth middleware and the CSRF hook returned `requestId: ''` — now return `request.id` (the pino-correlated ID), so client error reports can be matched to server logs.
- Webhook routes return plain text (`OK`, `INVALID SIGNATURE`) — correct; that's the contract Idram/Telcell expect, not a browser-facing API.

### 5.3 📝 MEDIUM — No process-level `unhandledRejection`/`uncaughtException` handlers

- **File:** `src/index.ts`
- **Issue:** Route-handler rejections are now caught by `setErrorHandler`, and the fire-and-forget promises in download routes all have `.catch`es — but a rejection escaping a worker callback or library timer would, on current Node, crash the process with only a stderr trace (no Sentry).
- **Impact:** Unattributed restarts. TODO added: install handlers that log + `Sentry.captureException` before exiting.

### 5.4 📋 Reviewed — fire-and-forget promises

All intentional fire-and-forget chains found (`downloadGrant.update` ×2, `SessionService.update` in `/session/me`, brand/favorite DB syncs) carry `.catch` handlers. No unhandled-rejection sources in route code.

---

## 6. CORS

### 6.1 ✅ HIGH — `CORS_ORIGIN` silently defaults to `http://localhost:3000` in production

- **File:** `src/config/env.ts:10`
- **Issue:** The schema default means a missing/typo'd Railway variable doesn't fail startup — it ships a build where (a) every browser request fails CORS and (b) **payment callback URLs redirect users to localhost** (`payments/index.ts` builds `callbackUrl` from `CORS_ORIGIN`). A trailing slash in the env value (`https://leve-rho.vercel.app/`) would also break origin matching, since the `Origin` header never has one.
- **Impact:** A single unset env var takes down the entire frontend-to-API path and the payment return flow, with no startup error.
- **Fix:** `validateEnv` now refuses to start in production if `CORS_ORIGIN` is not explicitly set, and the value is normalized by stripping trailing slashes. **Ops action:** confirm the Railway variable is exactly `https://leve-rho.vercel.app`.

### 6.2 ✅ HIGH — No `exposedHeaders` for rate-limit headers

- Fixed together with 4.5: `exposedHeaders: ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']`. `credentials: true` was already correct and is required for the cookie path; the header-based session fallback works regardless.

### 6.3 📝 MEDIUM — Payment callback URL coupled to `CORS_ORIGIN`

- **File:** `src/routes/payments/index.ts:54,106`
- **Issue:** Reusing the CORS allowlist value as "the frontend base URL" works only while both are a single identical origin. The moment a second allowed origin (custom domain migration, preview deploys) is needed, payment callbacks break or pin to the wrong host.
- **Impact:** Latent breakage during the planned custom-domain move. TODO added: introduce a dedicated `FRONTEND_BASE_URL` env var.

### 6.4 📋 LOW — Webhook routes receive CORS headers

- `/api/webhooks/*` are server-to-server; CORS response headers on them are inert (Idram/Telcell don't evaluate them) and the routes are protected by HMAC signatures, not origin. Not worth a scoped CORS config. Documented only.

---

## 7. Cookie Settings Consistency

Set-Cookie call sites: `auth.ts` (anon session create), `register/otp.ts` (verify, 30-day extension), `session/init.ts` (logout clear).

### 7.1 ✅ HIGH — Logout's `clearCookie` was rejected by browsers in this cross-site topology

- **File:** `src/routes/session/init.ts:88`
- **Issue:** `reply.clearCookie(name, { path: '/' })` emits an expiring Set-Cookie with default attributes (no `Secure`, effectively `SameSite=Lax`). Browsers refuse to accept any cookie from a *cross-site* response unless it is `SameSite=None; Secure`, and a cookie clear is just a Set-Cookie — so the deletion was silently dropped and the (deleted-in-Redis) session cookie lingered in the browser.
- **Impact:** Functional logout still worked (Redis key deleted server-side), but the browser kept presenting a dead cookie, shadowing the `x-session-id` header path on every later request and producing confusing mixed-identity behavior after re-login.
- **Fix:** `clearCookie` now passes the same attributes used when setting it (`httpOnly`, `secure`, `sameSite: 'none'`, `path: '/'`).

### 7.2 📋 Verified consistent — the two Set-Cookie sites

`auth.ts:73` and `otp.ts:134` both set `httpOnly: true, secure: true, sameSite: 'none', path: '/'`, differing only in `maxAge` (48 h anon vs 30 d verified — intentional, matches the Redis TTLs in `session.types.ts`). No `domain` attribute anywhere — correct, host-only cookies are what you want here.

### 7.3 📋 LOW — Known, accepted limitations of the no-custom-domain topology

- `SameSite=None` cookies are *third-party* cookies from the browser's view: Safari (ITP) and Firefox (TCP) refuse them entirely. The `x-session-id` header fallback (now consistent across all decorators per 2.1) is the actual session mechanism for those users.
- `secure: true` cookies on plain-HTTP localhost work in Chrome (localhost is a trustworthy origin) but may not in Safari — dev-only nuisance, not changed.
- Long-term fix for all of this is the planned custom domain (`api.leve.am`), which makes cookies first-party; the `TODO: remove when custom domain is configured` markers already in the code are the right breadcrumbs.

---

## 8. Missing Infrastructure

### 8.1 ✅ HIGH — `GET /api/csrf-token` had no rate limit

Covered in 3.3 — fixed.

### 8.2 ✅ HIGH — No burst limit on `POST /api/generate/preview` for verified users

- **File:** `src/routes/generate/index.ts`
- **Issue:** Anonymous users are capped (2 lifetime + 50/day/IP), but verified users had *only* the unenforced daily soft cap (15/day, nudge by design) and the global IP limiter between them and the fal.ai bill. A scripted verified session could fire hundreds of $0.04 generations per minute.
- **Impact:** Direct, unbounded cost exposure from a single free OTP verification.
- **Fix:** Route-level limit of 10 generations/min keyed by session — far above any human clicking speed, so it never conflicts with the "soft cap, never hard block" business rule, while capping scripted abuse at ~$24/hr/session instead of unbounded.

### 8.3 📝 MEDIUM — In-request upscale calls have no timeout

- **File:** `src/routes/download/index.ts` (all routes calling `ensureUpscaledHd`)
- **Issue:** Real-ESRGAN upscaling runs synchronously inside the request (unlike generation, which is correctly queued). The Fastify server has `connectionTimeout: 0` and default `requestTimeout` (disabled), so a hung upstream holds the connection — and the user's spinner — indefinitely.
- **Impact:** Connection/socket exhaustion under upstream degradation; terrible UX on first-download latency spikes. TODO added: wrap in `AbortSignal.timeout(~30s)` with a `hd_not_ready`-style retry response, or move upscaling into the worker at generation time.

### 8.4 📋 Verified adequate — body limits and auth coverage

- **Body size:** Fastify's default 1 MB `bodyLimit` covers all JSON routes; multipart is capped at 20 MB by plugin config *and* re-checked with an early-abort loop in the upload handler (`upload/index.ts:49–60`). Webhook bodies go through the same 1 MB default. No gap.
- **Auth guards:** Every route was checked against the table in 2.4. The only intentionally guard-free routes are `GET /health` (must work before readiness) and `GET /api/csrf-token` (must work pre-session; now rate-limited). Webhooks are signature-authenticated. Ownership checks (`sessionOwnsJob`/`sessionHasGrant`) gate every job-scoped read, and `payments/status` + `payments/intent` verify session-transaction linkage. No unguarded mutating route found.

---

## Incident Cross-Reference

| Production incident | Root cause (finding) | Status |
|---|---|---|
| CSRF plugin crashed on startup (option nesting) | Pre-refactor `@fastify/csrf-protection` config — replaced by Redis-token design | Resolved by refactor; design audited OK (3.5) |
| CSRF 403 on mobile Safari | Cookie-based double-submit cross-origin — replaced | Resolved; remaining gap was token-expiry recovery (3.2) ✅ |
| OTP verify 429 on a real user | Session keyGenerator never saw cookies due to plugin order (1.1) + cookie-only key with no header fallback (4.2), so it keyed by shared NAT/proxy IP | ✅ Fixed |
| Generate 403 after CSRF refactor | No client recovery from expired/missing token (3.2); tokenless requests rejected with no retry | ✅ Fixed |
| Upload worked, generate failed, identical token | Consume-on-use token in a prior implementation; current `EXISTS` check is reuse-safe (3.5) | Resolved previously; verified |

## Post-Deploy Verification Checklist

1. Confirm Railway `CORS_ORIGIN=https://leve-rho.vercel.app` (no trailing slash) — startup now fails loudly if unset.
2. After deploying `trustProxy: 1`, sample `request.ip` in logs: expect distinct real client IPs. If all requests show one internal IP, Railway has >1 proxy hop — bump to `2`.
3. Watch OTP verify 429 rate (should drop to ~zero) and `csrf_invalid` 403 rate (client now auto-recovers; sustained occurrences indicate Redis issues).
4. Mobile Safari end-to-end: upload → generate → OTP verify → spend credit → download. Steps 3–5 were broken before this commit.
