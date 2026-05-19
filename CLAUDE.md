# LEVE — Claude Code Project Configuration

## Project Overview

LEVE is a verticalized AI creative engine for Armenian SMEs. It transforms mobile product photos into studio-grade marketing visuals. V1 targets retail, beauty, and marketplace sellers (Wildberries/Ozon).

**Core Promise:** Upload a product photo → get 4 marketplace-ready variants → pay to download HD → done in under 30 seconds.

**Market:** Armenian micro-businesses, Instagram boutiques, Wildberries sellers, beauty clinics, jewelry shops.

---

## Architecture Overview

```
Frontend (Next.js 15 App Router)
  └── /app — pages and layouts
  └── /components — shared UI components
  └── /lib — client utilities, API wrappers, i18n

Backend (Node.js + Fastify + TypeScript)
  └── /src/routes — API endpoints
  └── /src/services — business logic
  └── /src/workers — BullMQ job processors
  └── /src/providers — AI provider abstraction (model router)

Infrastructure
  └── Redis (BullMQ queues + session storage)
  └── AWS S3 + CloudFront (image CDN, signed URLs)
  └── PostgreSQL + Prisma (transactions, job records)
```

---

## AI Provider Strategy

**Primary:** fal.ai with FLUX.1-schnell (preview) and FLUX.1-dev (HD output)
**Product Preservation:** Replicate + IP-Adapter SDXL for jewelry/glass/transparent products
**Content Moderation:** AWS Rekognition on every upload
**Model Router:** ALL AI calls go through `/src/providers/model-router.ts` — never call providers directly from routes or workers

### Provider Routing Logic
```
Preview generation (all) → fal.ai FLUX.1-schnell (target: <8s)
HD generation (standard) → fal.ai FLUX.1-dev (target: <18s)
HD generation (jewelry/reflective) → Replicate IP-Adapter (target: <25s)
fal.ai failure → Replicate SDXL fallback
Both fail → error + retry offer + NO credit deduction
```

**Do NOT use Stability AI.** Business instability + poor product shape preservation without heavy ControlNet pipelines.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) | Edge delivery, RSC, mobile-first |
| Styling | Tailwind CSS v3 | Design token system below |
| Backend | Node.js + Fastify + TypeScript | Lightweight for V1; NestJS in V2 |
| Queue | BullMQ + Redis | Async AI jobs, priority queues |
| Database | PostgreSQL + Prisma | Transactions, idempotency records |
| Storage | AWS S3 + CloudFront | 30-day lifecycle anon, signed URLs |
| AI Primary | fal.ai (FLUX.1) | Pay-per-call, no GPU infra |
| AI Fallback | Replicate (IP-Adapter) | Product preservation pipeline |
| Moderation | AWS Rekognition | NSFW filter before any AI call |
| Auth | Phone OR Email OTP | Required before first generation; /register page |
| Payments | Idram (primary) → Telcell → ArCa | Armenian providers, webhook-based |

---

## Design System — Minimalist Dark with Armenian Accent

**Color rationale:** The accent color derives from the Armenian flag's official orange (#F2A800, Pantone 1235) — known colloquially as "apricot orange," a culturally resonant color in Armenia. Darkened and saturated for dark-theme use as #D64C1A (Armenian vermillion-apricot). This is a deliberate cultural anchor, not a generic accent choice.

```css
/* Core Palette */
--color-bg-base:      #0A0A0A   /* app background */
--color-bg-surface:   #141414   /* cards, panels */
--color-bg-elevated:  #1E1E1E   /* modals, dropdowns */
--color-border:       #2A2A2A   /* default border */
--color-border-hover: #3A3A3A   /* hover border */

/* Text */
--color-text-primary:   #FFFFFF
--color-text-secondary: #A0A0A0
--color-text-muted:     #4A4A4A

/* Armenian Accent — apricot vermillion */
--color-accent:         #D64C1A   /* primary CTAs, highlights */
--color-accent-hover:   #E85A22   /* hover state */
--color-accent-subtle:  #2A1208   /* accent tint background */
--color-accent-border:  #5A2010   /* accent border */

/* Semantic */
--color-success: #4CAF50
--color-error:   #EF4444
--color-warning: #F59E0B

/* Typography */
--font-ui:      'Inter', system-ui, sans-serif
--font-display: 'Plus Jakarta Sans', Inter, sans-serif

/* 8px Grid */
--space-1: 4px  --space-2: 8px   --space-3: 12px  --space-4: 16px
--space-6: 24px --space-8: 32px  --space-12: 48px --space-16: 64px

/* Radius */
--radius-sm: 6px  --radius-md: 12px  --radius-lg: 20px  --radius-full: 9999px
```

**Design Rules (non-negotiable):**
- No gradients on interactive elements. Solid fills only.
- Max 2 font weights per screen (400 regular + 600 semibold)
- Touch targets minimum 48×48px (Armenian users are mobile-only)
- No color shadows — use opacity shadows only (`rgba(0,0,0,0.x)`)
- Primary CTA: `bg-[#D64C1A]` solid, white text, no border
- Secondary CTA: `border border-[#2A2A2A]`, no fill, white text
- Loading states: always animated (skeleton shimmer or artistic progression). Never a blank screen.

---

## Using Claude Design (claude.ai) for This Project

Claude's inline artifact/visualization tool can generate functional React screens. Use this workflow:

**Step 1 — Generate each screen as a React artifact in claude.ai.**
Ask: "Build a React component for [screen name] using this design system: bg #0A0A0A, accent #D64C1A, Inter font, Tailwind. No gradients on buttons. Touch targets 48px minimum."

**Screens to generate in order:**
1. Landing / intent selection (3 big action buttons)
2. Upload zone (drag + tap, progress animation)
3. Artistic progression loading screen (phase text animation)
4. 2×2 variant grid with before/after slider
5. Text overlay editor (price, sale text, Armenian typography)
6. Paywall bottom sheet (credit pack selection)
7. Payment redirect state
8. HD download success + phone capture prompt

**Step 2 — Test each artifact interactively in claude.ai first.** Click through states. Fix any UX issues before moving to code.

**Step 3 — Paste the approved artifact code into the Next.js app.** Claude Code handles wiring up the actual API calls, state management, and routing.

**Step 4 — The before/after slider and loading animation are the two most important UX moments.** Spend extra iteration time on these in claude.ai before finalizing.

---

## Critical Business Rules (Enforced in All Code)

1. **Session Identity:** Capture phone number after first successful generation (never before). Store sessionId in httpOnly cookie + Redis. Never destroy a session that has generated images within 48h.

2. **Credit Logic:**
   - Free: 3 HD images given after verification (leve_free_credits in sessionStorage)
   - Starter: 1,500 AMD → 5 HD downloads
   - Creator: 4,000 AMD → 20 HD downloads (default selected, lowest per-image cost)
   - Monthly: 12,000 AMD/month → 50 HD downloads (resets monthly)
   - Pro subscription: show price only, billing is V2 (shown ONLY after 3+ purchases)

3. **Credit safety:** Check credits BEFORE dispatching job. Deduct ONLY on successful generation. Refund automatically on generation failure. Use atomic Redis MULTI/EXEC for all credit operations.

4. **AI Job Priority:**
   - Paid users: priority 1 (HIGH)
   - Returning session (phone captured): priority 5 (MEDIUM)
   - Anonymous first-time: priority 10 (STANDARD)

5. **Payment Providers:**
   - Idram: primary. Highest market penetration. Webhook is form-encoded, not JSON.
   - Telcell: secondary. Similar webhook pattern.
   - ArCa (via Armenian bank): enables Visa/MC. Requires bank merchant agreement.
   - Never add credits without webhook signature validation.
   - Always implement idempotency (7-day Redis key per paymentId).

6. **Image Validation (in order, fail fast):**
   - File type: magic bytes check (not extension)
   - Size: max 20MB
   - Dimensions: min 512×512, max 8000×8000
   - Content moderation: AWS Rekognition
   - Rate limit: 10/hour anon, 50/hour paid

7. **Storage Policy:**
   - Raw uploads: deleted after 48h (always — privacy)
   - Generated previews: 30d anon, 90d paid (S3 lifecycle)
   - HD downloads: signed CloudFront URL, 24h expiry
   - Variants preserved 24h even after payment failure (conversion recovery)

8. **Performance Budgets (hard limits):**
   - LCP: <2s (block deploy if exceeded)
   - Preview generation: <8s target, 15s hard limit
   - HD generation: <18s target, 25s hard limit
   - Payment confirmation: <2s target

---

## V1 Scope — Final List

**IN SCOPE:**
- Upload + validation pipeline
- 6 product category cards (Beauty, Jewelry, Fashion, Food, Marketplace, Custom)
- Phone OR email OTP registration (/register page, required before first generation)
- 10 hero templates (beauty ×3, retail ×3, marketplace ×4)
- Category pre-filter on template tabs + RefinementPanel (style chips + custom text)
- Platform export picker (8 formats: Original HD, Instagram feed/story, Facebook, WB, Ozon, Telegram, list.am)
- CATEGORY_CONFIG with per-category prompt config + refinement chips (in lib/constants.ts)
- next-intl localisation (cookie-based, hy/ru/en, LanguageSwitcher in header)
- AI preview generation (4 variants, fal.ai FLUX-schnell)
- AI HD generation (fal.ai FLUX-dev + Replicate IP-Adapter)
- Armenian/Russian/English text overlays (price, sale, new collection)
- Before/After reveal slider
- Watermarked free preview (2 per session)
- HD download behind paywall
- Idram payment integration
- Telcell payment integration
- Session tracking (Redis, httpOnly cookie)
- Phone capture (optional, post-generation)
- Rate limiting
- HY + RU + EN UI strings
- Mobile-first responsive (390px primary)

**OUT OF SCOPE (V2 only — do not implement):**
- Persistent user accounts / password reset (session-only in V1)
- Brand kit / saved brand styles
- Caption / copywriting generator
- Multi-platform export (story sizing, Telegram format)
- Video generation / animated promos
- Agency workspace
- Analytics dashboard
- Social calendar
- Holiday template automation
- Marketplace API direct upload
- Bulk SKU processing
- Pro subscription billing (show price, but billing is V2)
- Desktop-optimized layouts
- Push notifications

---

## Folder Structure

```
leve/
├── CLAUDE.md                        ← this file
├── .claude/
│   ├── agents/
│   │   ├── frontend.md              ← UI component rules + design system
│   │   ├── backend.md               ← Fastify API + session + queue
│   │   ├── ai-pipeline.md           ← model router + prompt engineering
│   │   └── payments.md              ← Idram/Telcell/ArCa integration
│   └── commands/
│       ├── new-component.md         ← scaffold UI component
│       ├── new-route.md             ← scaffold Fastify route
│       ├── new-template.md          ← add AI generation template
│       └── check-scope.md           ← V1 scope guard
├── apps/
│   ├── web/                         ← Next.js 14 frontend
│   └── api/                         ← Fastify backend
├── packages/
│   ├── ui/                          ← shared components
│   ├── types/                       ← shared TypeScript types + template registry
│   └── config/                      ← eslint, tsconfig, tailwind config
└── docker-compose.yml               ← local dev: Redis + PostgreSQL
```

---

## Code Conventions

- TypeScript strict mode everywhere. No `any`. No `@ts-ignore` without comment.
- Functional React components only. No class components.
- Server Components by default. `'use client'` only when needed.
- Error handling: all async in try/catch. Routes return `{ success, data?, error?, requestId }`.
- All env vars validated with zod at startup. App refuses to start if missing.
- Structured logging with pino. No console.log in production.
- Generate requestId (nanoid) for every request. Log with every AI call.
- All Armenian/Russian/English strings in `/lib/i18n/` — never hardcoded.

---

## Common Mistakes to Avoid

1. Calling AI providers directly from routes — always use the model router.
2. Storing generated image URLs in client state only — always persist to Redis first.
3. Showing the paywall before the user sees their variants. Psychological ownership first.
4. Adding credits without signature validation. This is a fraud vector.
5. Using read-then-write for credit operations. Always atomic.
6. Showing Pro subscription offer before the user has made 3 purchases.
7. Letting session expire during payment flow — extend TTL on payment initiation.
8. Hardcoding any user-facing text — all copy goes through i18n from day one.
