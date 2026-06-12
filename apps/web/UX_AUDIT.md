# LEVE Web App — UI/UX Audit

Date: 2026-06-12 · Scope: every file under `apps/web/` · Primary device: iPhone Safari, 390px · Primary language: Armenian

Severity legend: **CRITICAL** = blocks or corrupts the core flow · **HIGH** = measurable conversion/trust damage · **MEDIUM** = friction, fix soon · **LOW** = polish.

Status legend: ✅ fixed in this commit · 📝 `// TODO: [UX]` comment added in code · ⛔ flagged only (Armenian copy left untouched per maintainer instruction).

---

## 1. Conversion flow — friction audit

**Tap count, landing → first generation (happy path): 5 taps.**
1. Category card on landing (`landing-content.tsx:163` — also pre-writes `leve_category`, good)
2. Upload zone tap (`upload-zone.tsx:289`)
3. Photo pick (system sheet)
4. Continue (`upload-zone.tsx:443`)
5. Generate (`templates/page.tsx` — a scene is auto-pre-selected per category, so Generate is immediately tappable)

This is a tight funnel. The auto-selected first scene (`templates/page.tsx:222-228`) and the category picker that only opens when no category exists are both doing the right thing. The OTP wall triggers exclusively off the server's `anon_limit_reached` 403 (`use-generate.ts:63`), i.e. after the 2nd free generation, never earlier — correct placement. The pending selection is snapshotted before the redirect and restored on return (`leve_pending_generate`), and `/register` honors `leve_return_to` → user lands back on `/templates` with scene/chips/text restored.

| Sev | Finding | Status |
|---|---|---|
| HIGH | `upload-zone.tsx` — Continue is silently disabled when a photo is chosen but no category is picked. On a 390px screen the category chips can be scrolled out of view, so the user stares at a dead button. Added an inline hint ("Select a category below to continue") above the button. | ✅ |
| HIGH | `templates/page.tsx` — header back button used `AppHeader`'s default `backHref="/"`, dropping the user from scene selection all the way back to the landing page (upload state kept in sessionStorage, but the user perceives it as losing their place). Now points to `/upload`. | ✅ |
| MEDIUM | After OTP verification the user returns to `/templates` with their setup restored but must tap Generate again. Auto-dispatching the pending generation on return would save one tap at the single highest-intent moment in the funnel. | 📝 (noted here; needs product sign-off since it spends the first free credit without an explicit tap) |
| MEDIUM | `templates/page.tsx:104-107` — if the user somehow arrives without a category the picker opens as a blocking sheet that cannot be dismissed until a choice is made. Acceptable, but it is the only hard modal gate pre-generation. | flagged |
| LOW | Landing "See all 30 scenes" routes to `/upload`, not to a scene browser — mild expectation mismatch (`landing-content.tsx:422`). | flagged |

## 2. Error states

| Sev | Finding | Status |
|---|---|---|
| CRITICAL | `messages/hy.json` `payment.confirming_sub` reads "Խնդրում ենք բաց թողնել այս էկրանը" — "բաց թողնել" means *skip/abandon*, not *keep open*. While payment confirmation is polling, the Armenian copy tells the user to leave the screen — the exact opposite of the English ("Please keep this screen open"). Should be "բաց պահել". | ⛔ Armenian values locked — **must be fixed by a native reviewer** |
| HIGH | `register/page.tsx:handleContinue` — an OTP send failure (network error / non-2xx) advanced to the code-entry step anyway. The user waits for a code that was never sent, behind a 45s resend lock. Now stays on the contact step and shows `register.otp_send_failed`. | ✅ |
| HIGH | `otp-form.tsx:handleVerify` — a 429 from the verify route's rate limiter (10/15min) rendered as "Invalid code", sending users into a retry loop that keeps them blocked. 429 now shows its own `otp_rate_limited` message. (Wrong-vs-expired codes are deliberately indistinguishable server-side — `otp.ts:121` anti-enumeration — so a single "invalid" message for those is correct.) | ✅ |
| MEDIUM | Generation failure/timeout: `processing-screen.tsx` writes `leve_generation_error` and bounces to `/templates`, which shows a specific message (timeout / quality gate / generic) **and** restores scene+chips+text for one-tap retry. Good pattern, no change. | — |
| MEDIUM | Payment failure: `payment/callback/page.tsx` distinguishes failed vs timeout and offers "Back to results"; `paywall-sheet.tsx` failed state offers Retry + "Choose different method". Adequate. Missing: a support contact escalation after repeated failures. | flagged |
| MEDIUM | `paywall-sheet.tsx:163-169` — if the payments API responds 200 without a provider URL, `window.location.href = undefined` navigates to a literal `/undefined` page. | 📝 |
| MEDIUM | Network offline mid-generation: both polling loops show "Reconnecting…" after 3 consecutive failures, but the failure counter is unbounded — the user can sit on "Reconnecting…" forever with no retry/exit action. | 📝 (`processing-screen.tsx`) |
| LOW | Upload validation errors are fully mapped server-code → localized message (`upload-zone.tsx:224-234`), incl. magic-byte, size, resolution, moderation, rate limit. Good. | — |

## 3. Loading and waiting states

| Sev | Finding | Status |
|---|---|---|
| HIGH | Mobile Safari throttles/pauses `setInterval` in background tabs. When the user switches apps during the 15–20s wait and comes back, the processing screen could appear frozen until the next throttled tick. Both `processing-screen.tsx` and `results/page.tsx` polls now fire immediately on `visibilitychange → visible` (with a `finished` guard against double redirects). | ✅ |
| MEDIUM | Processing screen is genuinely phase-driven (queued → processing → generating → finalizing from `/api/generate/status`), with the user's own photo as the hero and a shimmer sweep — meaningfully better than a spinner. No change. | — |
| LOW | `processing-screen.tsx` `DONE_ANIMATION_MS = 50` — the success checkmark overlay is unmounted after 50ms; nobody ever sees it. | 📝 |
| — | Double-submission: Generate, Continue, Verify, Download HD, payment buttons all disable while in flight. Skeletons exist on results CTA, history grid, download preview. Verified, no gaps found. | — |

## 4. Mobile-specific issues

| Sev | Finding | Status |
|---|---|---|
| CRITICAL | `templates/page.tsx:472` — the fixed bottom Generate bar used class `safe-area-pb`, **which is not defined anywhere** (the real utility is `safe-bottom`, `globals.css:134`). On every iPhone with a home indicator the primary CTA of the whole funnel sat partially behind the indicator. | ✅ |
| HIGH | `app/layout.tsx` viewport had `maximumScale: 1, userScalable: false` — blocks pinch zoom on Android Chrome entirely (WCAG 1.4.4) and is hostile to low-vision users. Removed; to prevent the resulting iOS focus auto-zoom, the two remaining sub-16px inputs (`prompt-textarea.tsx`, `text-overlay-section.tsx` overlay input) were bumped to 16px. | ✅ |
| HIGH | `app/layout.tsx` — Inter was loaded with `latin, latin-ext` subsets only. All Russian copy (secondary locale) rendered in the system fallback font. Added `cyrillic, cyrillic-ext`. Armenian script does not exist in Inter at all → Armenian renders in system-ui; consider bundling a dedicated Armenian face (e.g. Noto Sans Armenian) as `--font-ui` fallback. | ✅ subsets / 📝 Armenian face |
| MEDIUM | Tap targets below 44px: refinement chips (~33px), quick-fill chips (~29px), overlay position buttons (~33px), language-switcher pills (~26px), category badge pill on templates (~22px). The dismiss "✕" buttons were fixed (44px hit area via negative margins); "Change photo" got an invisible padding extension. The bordered chips need a design pass — noted in code. | ✅ partial / 📝 chips & switcher |
| — | Camera upload: `input accept` covers HEIC/HEIF/AVIF/TIFF with extension fallback for iOS's empty `file.type` (`upload-zone.tsx:33-48`). Deliberately no `capture` attribute — iOS then offers both camera and library, which is correct here. | — |
| — | Before/after slider uses pointer events + `touchAction: 'none'` + `setPointerCapture` — works with touch. But only the 48px handle is draggable; tapping elsewhere on the image does nothing. | 📝 (`results/page.tsx`) |
| — | Keyboard: register/OTP inputs are vertically centered (`justify-center`), results edit textarea lives in normal flow above the sticky CTA — no fixed-position element fights the keyboard. The sticky Download CTA sits 64px above the viewport bottom on purpose to clear BottomNav. Verified by reading layout; runtime check on device still recommended. | — |
| LOW | Hover-only affordances all have touch fallbacks (expand button: `sm:opacity-0 sm:group-hover:opacity-100` so always visible on mobile; bookmark: `opacity-100 lg:opacity-40`). No stuck-hover states found. | — |

## 5. Navigation and state persistence

| Sev | Finding | Status |
|---|---|---|
| HIGH | Every page guards its required sessionStorage state: `/templates` → `/upload` without upload key; `/processing` → `/templates` without job or if stale (>5min); `/results` → `/` without job; `/download/success` → `/history` without job; `/download` and `/history` behind verified guard. A user in a fresh tab is redirected, never shown a blank screen. Verified, no change. | — |
| HIGH | Back from templates → upload preserves category (`leve_category` read on mount, `upload-zone.tsx:107-110`) and the previously chosen photo is *not* preserved (file objects can't survive navigation) — the upload zone shows empty. Acceptable; preview restoration would require IndexedDB. | flagged |
| MEDIUM | Generation failure restores scene, chips, custom text (`templates/page.tsx:181-203`). Verified. | — |
| MEDIUM | Browser back from `/processing` lands on `/templates` while the job keeps running; the dispatched-at timestamp lets `/processing` be re-entered within 5 minutes, but nothing on `/templates` tells the user a job is still in flight (only `/history` shows the "generation in progress" banner). | 📝 (noted here) |
| MEDIUM | `app/(app)/intent/page.tsx` was a live route rendering a literal placeholder string "intent". Now redirects to `/`. | ✅ |
| LOW | `template-grid.tsx` + `variant-grid.tsx` are dead code from the pre-scene-library design; template-grid even routes to `/processing` without dispatching a job — a trap if ever re-linked. | 📝 |

## 6. Empty states and first-time experience

| Sev | Finding | Status |
|---|---|---|
| **CRITICAL** | `i18n/request.ts` defaulted to **English** for first-time visitors while `getCurrentLocale()` in `language-switcher.tsx`/`user-menu.tsx` defaults to **hy** — so a brand-new Armenian user saw an English landing page with the ՀԱՅ pill already highlighted (tapping it appears to do nothing the first time since the cookie then matches the highlight). Primary market is Armenian; server default is now `hy` and the two fallbacks are in sync. | ✅ |
| — | Scene grid can never render empty: `getScenesForCategory` falls back to the full library for unknown/custom/empty categories (`constants.ts:796-811`). Verified. | — |
| — | History empty state has icon + title + subtitle + CTA. Results page handles expired/unavailable preview URLs with an inline error + retry (`results/page.tsx:527-540`), and download success has a 10s timeout fallback pointing to History. Verified. | — |
| MEDIUM | History sticky CTA always said "Generate your first image" even when the grid is full of jobs. Now switches to "Generate a new image" (`history.generate_new`, all 3 locales). | ✅ |

## 7. Copy and localisation

| Sev | Finding | Status |
|---|---|---|
| **CRITICAL** | `hy.json` contains Cyrillic characters embedded inside Armenian words — `փорձել` (scenes.error_failed: Cyrillic о+р), `հетո…` (refinement.custom_hint: Cyrillic о), `Լավագույн` (landing.pricing_creator_feature_1: Cyrillic н). These render with visible glyph mismatches in any real font and read as corrupted text. Also `կատատեգորիա` (typo, pricing_free_feature_2) and `լոռացված (blurry)` (scenes.error_quality_gate — not a word, plus untranslated English). | ⛔ Armenian values locked — **needs native-speaker pass**; list above is the complete inventory |
| HIGH | `constants.ts` scene `floating_levitation` has `nameHY: 'Lebecouoir'` — corrupted Latin text shown to Armenian users in the scene grid. | 📝 (value left untouched) |
| HIGH | `ru.json` refinement.custom_hint contained «ЗЕГЧ» — the Armenian word ԶԵՂՉ transliterated into Cyrillic, meaningless in Russian. Fixed to «СКИДКА». Also "переведите дух пару минут" → "подождите пару минут". | ✅ |
| HIGH | Business rule violation — "NEVER use the word credits in UI copy": `en.json` had `download_hd_credit: "1 credit"` and `insufficient_credits: "No credits remaining…"`; `ru.json` had "1 кредит". Fixed to images-vocabulary in en/ru. `hy.json` still says "1 կրեդիտ" (`results.download_hd_credit`). | ✅ en+ru / ⛔ hy |
| — | Key parity verified programmatically: en/hy/ru all 435+ keys in sync, no fallback-to-key-string risk. New keys added in this audit exist in all three files. | ✅ |
| — | AMD formatting: prices use `toLocaleString()` + ֏ suffix consistently; `formatAMD` helper exists (`utils.ts`). Russian copy uses space-grouped "1 500 ֏" per RU convention. OK. | — |
| — | Phone input: international-first with country picker (+374 default, +7, other), local-format mask + placeholder. Correct for the market. | — |
| LOW | `results.edit_phase_done` "Done ✓" / hy "Պատրաստ է ✓" — decorative symbol; the no-symbols rule technically covers buttons only, this is an overlay label. Left as-is. | flagged |

## 8. Payment and trust signals

| Sev | Finding | Status |
|---|---|---|
| — | Paywall shows pack contents and full price (AMD + per-image) before any provider choice; both providers and prices visible simultaneously; unverified users get the "2 free images" banner *above* the packs (value-first, matches business rule); close affordances exist in pricing and processing states; backdrop click closes in pricing state only. Subscription tier hidden until `showSubscriptionOffer` (3+ purchases rule) — all verified correct. | — |
| HIGH | Soft daily cap nudge was dead: `templates/page.tsx` wrote `leve_soft_cap_reached` to sessionStorage but **no code ever read it** — the "nudge to buy, not hard block" business rule was silently unimplemented. Results page now shows a dismissible nudge banner with a "See packs" CTA that opens the paywall. | ✅ |
| — | Post-payment: callback page polls 30s with distinct success/failed/timeout screens; success auto-forwards to download in 600ms; paywall success state offers the HD download button immediately; idempotent order cleanup on every terminal state. Verified. | — |
| MEDIUM | Closing the paywall during "processing" silently abandons order polling (order keys removed, `paywall-sheet.tsx:178-185`). The webhook + `/api/download/check` re-poll on close covers credit delivery, but the user gets no "we'll keep checking" reassurance. | flagged |
| LOW | `paywall.secure` "Secure payment · AMD only" is the only trust line; no provider logos. | flagged |

## 9. Accessibility

| Sev | Finding | Status |
|---|---|---|
| HIGH | Pinch-zoom block (see §4) — removed. | ✅ |
| MEDIUM | Icon-only buttons missing labels: paywall pricing close ✕ (now `aria-label`), quality-banner dismiss ✕ (now localized `common.dismiss`), hardcoded English `aria-label="Back"` / `"Go back"` on register page and AppHeader (now `tCommon('back')`). Remove-file and lightbox buttons already had labels. | ✅ |
| MEDIUM | OTP inputs: added `autoComplete="one-time-code"` on the first field — iOS now offers the SMS code above the keyboard instead of forcing manual entry (the existing paste-distribution logic consumes it). | ✅ |
| MEDIUM | Selected state on scene thumbnails uses border color + a checkmark icon (not color alone ✓); aspect-ratio "recommended" state however is **green border only** — no icon/text for color-blind users. | 📝 covered by chips TODO in `refinement-panel.tsx` |
| MEDIUM | Before/after slider: `role="slider"` + `aria-valuenow` + keyboard arrows exist (good), but the before/after images themselves are `alt=""` while being the page's primary content. | 📝 |
| LOW | Scene grid focus order is DOM order (left-to-right grid) — logical. `role="button"` thumbnails handle Enter/Space. Verified. | — |

## 10. Performance perception

| Sev | Finding | Status |
|---|---|---|
| HIGH | Cyrillic font subsets (see §4) — the entire RU experience was rendering in fallback before webfont semantics even mattered. | ✅ |
| MEDIUM | History grid thumbnails now `loading="lazy"` (each is a full preview-size image in a 2-col grid; the API serves one resolution). Scene "thumbnails" are pure CSS gradients — zero image cost, no CLS. | ✅ |
| MEDIUM | Landing showcase loads 8 CDN images (4 before/after pairs) eagerly via the ambient slider; below the fold on mobile. The slider crossfade preloading is intentional; lazy-mounting the section via the existing `useInView` would cut initial weight. | flagged |
| — | CLS: slider/preview containers all reserve space via `aspectRatio` style before images arrive; processing hero pins height at 40vh; pulse skeletons fill gaps. No unreserved async content found. | — |
| — | First paint of landing: framer-motion entrance animations run client-side on a client component; hero text starts at `opacity: 0` until hydration — on slow devices the headline is invisible until JS lands. Consider `initial={false}` for above-the-fold hero. | flagged |

---

## Summary of code changes in this commit

**Fixed (CRITICAL/HIGH):**
- `i18n/request.ts` — default locale en → hy (sync with switcher fallbacks; primary market)
- `templates/page.tsx` — `safe-area-pb` → `safe-bottom` (CTA under home indicator); back button → `/upload`; error colors → `text-error` token; localized + enlarged dismiss button; bigger "Change photo" hit area
- `app/layout.tsx` — Inter cyrillic subsets; pinch-zoom re-enabled
- `prompt-textarea.tsx`, `text-overlay-section.tsx` — 16px input text (prevents iOS focus auto-zoom)
- `otp-form.tsx` — 429 → dedicated rate-limit message; `one-time-code` autofill
- `register/page.tsx` — OTP send failure no longer advances silently; localized back labels
- `upload-zone.tsx` — category-required hint under disabled Continue; dead `border-border-hover` token → `border-strong`
- `processing-screen.tsx` + `results/page.tsx` — poll immediately on tab foreground (mobile Safari background throttling); double-redirect guard
- `results/page.tsx` — soft-cap purchase nudge implemented (flag was written but never read)
- `history/page.tsx` — state-aware CTA label; lazy thumbnails
- `intent/page.tsx` — placeholder route → redirect home
- `paywall-sheet.tsx`, `app-header.tsx` — aria-labels
- `en.json`/`ru.json` — "credits" vocabulary removed (business rule); «ЗЕГЧ» → «СКИДКА»; new keys (`dismiss`, `otp_rate_limited`, `otp_send_failed`, `category_required_hint`, `soft_cap_nudge`, `soft_cap_cta`, `generate_new`) in all 3 locales

**Not changed — requires native Armenian review (values intentionally left untouched):**
- `hy.json`: Cyrillic chars in `փорձել`, `հетո`, `Լավագույн`; typo `կատատեգորիա`; `լոռացված (blurry)`; payment `confirming_sub` says "skip this screen" instead of "keep this screen open" (**worst offender — it's on the payment confirmation screen**); `download_hd_credit` still says "կրեդիտ"; "ստուդիոն որակի/լուսանկար" reads as a noun-with-article used adjectivally — native review recommended (likely "ստուդիական")
- `constants.ts`: `nameHY: 'Lebecouoir'` for the Floating scene

**TODO: [UX] comments added (MEDIUM/LOW):** chip/switcher tap targets, slider tap-to-seek, unbounded reconnect loop, paywall redirect-URL guard, retry-after surfacing, copy-link copies gated URL, 50ms done animation, dead template/variant grid components, slider alt text, Armenian font face.
