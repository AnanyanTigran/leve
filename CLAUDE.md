# LEVE — Claude Code Project Configuration

## Project Overview

LEVE is a verticalized AI creative engine for Armenian SMEs. It transforms mobile product photos into studio-grade marketing visuals. V1 targets retail, beauty, and marketplace sellers (Wildberries/Ozon).

**Core Promise:** Upload a product photo → see ONE studio-quality image in 20 seconds → pay to download it clean → done.

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

**Primary:** fal.ai with FLUX.1 Kontext [pro] — image-to-image editing model that preserves product shape exactly while changing background and environment. All generations go through Kontext.
**Content Moderation:** AWS Rekognition on every upload
**Model Router:** ALL AI calls go through `/src/providers/model-router.ts` — never call providers directly from routes or workers

### Provider Routing Logic
```
All generation (anonymous preview) → fal.ai FLUX.1 Kontext [pro] at 1024px ($0.04)
All generation (verified user)     → fal.ai FLUX.1 Kontext [pro] at 2048px ($0.04)
fal.ai failure                     → return error + retry offer, NO credit deduction
```

No Replicate. No IP-Adapter. No schnell. No dev. Kontext handles all categories.

**Do NOT use FLUX.1-schnell, FLUX.1-dev, Replicate, or Stability AI.**

Kontext is image-to-image — it takes the user's actual product photo as input and edits the background/environment while preserving the product exactly.

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
   - Anonymous: 2 free watermarked generations (no OTP required), then OTP wall
   - Free on OTP verification: 2 HD download credits
   - Starter: 1,500 AMD → 5 HD downloads
   - Creator: 4,000 AMD → 20 HD downloads (default selected, lowest per-image cost)
   - Monthly: 12,000 AMD/month → 50 HD downloads (V2 — show price only at launch)
   - Subscription: shown ONLY after 3+ purchases
   - NEVER use the word "credits" in UI copy. Say "images" or "studio images."
   - Soft daily cap: 15 free generations/day for verified users → show nudge to buy, not hard block

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
- Upload + validation pipeline (anonymous allowed, no OTP needed)
- 2 free anonymous watermarked generations before OTP wall
- 6 product category cards (Beauty, Jewelry, Fashion, Food, Marketplace, Custom)
- Phone OR email OTP registration — required before HD download (NOT before generation)
- 2 free HD download credits granted on OTP verification
- 30-scene library across 5 groups (Studio, Lifestyle Surfaces, Environment, Seasonal, Creative)
- Category → scene filtering (shows 6-8 relevant scenes first, "Show all" expands to 30)
- 4 universal refinement chip groups (Lighting, Angle, Mood, Format/aspect ratio)
- Category-specific refinement chips
- Aspect ratio picker BEFORE generation (1:1, 4:5, 3:4, 9:16, 16:9)
- Single generated image output (not 4 variants)
- Iterative editing: "Edit" button sends generated image + instruction back to Kontext
- AI generation via FLUX.1 Kontext [pro] only — no schnell, no dev, no Replicate
- Server-side custom text detection — text overlay requests extracted, applied via sharp SVG composite, NOT sent to AI
- Armenian/Russian text translation via Amazon Translate before prompt injection
- Brand name capture after OTP (optional, stored in User record)
- Favorite scene persistence (stored in User record)
- Armenian/Russian/English text overlays (price tag, Sale, New Collection, custom)
- Before/After reveal slider
- Watermarked preview (anonymous: 1024px, verified: 2048px)
- HD download = same generated file, no watermark, served via CloudFront signed URL
- Idram payment integration
- Telcell payment integration
- Persistent User model (phone/email as identity, credits survive session expiry)
- Platform export picker (8 formats: Original HD, Instagram feed/story, Facebook, WB, Ozon, Telegram, list.am)
- next-intl localisation (hy/ru/en)
- Rate limiting
- Mobile-first responsive (390px primary)

**OUT OF SCOPE (V2 only):**
- Password / email+password signup
- Google / Apple OAuth
- Brand Kit (logo, font palette) — brand NAME only in V1
- Caption generator
- Video generation
- Agency workspace
- Analytics dashboard
- Social calendar
- Marketplace API direct upload
- Bulk SKU processing
- Full subscription billing (show Monthly price, no billing in V1)
- Desktop-optimized layouts
- Push notifications
- Multi-product scene upload

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

---

## Architecture Decisions Log

### 2026-05 — Kontext Migration
- Switched from FLUX.1-schnell (preview) + FLUX.1-dev (HD) to FLUX.1 Kontext [pro] only
- Reason: Kontext is image-to-image — preserves product shape exactly
- HD download = same generated file, watermark removed via CloudFront signed URL
- No separate HD generation queue — hdQueue and hd.worker removed
- Cost: $0.04/image fixed, same for anon (1024px) and verified (2048px)

### 2026-05 — Auth Gate Repositioning
- OTP moved from before-generation to before-HD-download
- Anonymous users: 2 free watermarked generations, then OTP wall
- Verified users: unlimited generations, 2 free downloads, then pay
- Rationale: show value first, gate at purchase intent moment

### 2026-05 — User Model Added
- Persistent User record in PostgreSQL (phone or email as unique key)
- Credits dual-written: Redis session (real-time) + User.creditsRemaining (persistent)
- Session expiry no longer loses credits — restored on OTP re-verification
- brandName and favoriteSceneId stored on User for brand consistency

### 2026-05 — Scene Library
- Replaced 10 hero templates with 30 scenes across 5 groups
- Scene-first UX: user picks scene, category filters default shown
- 4 universal chip groups + category-specific chips
- Aspect ratio selected before generation (native Kontext composition)

### 2026-05 — Text-on-Image Detection
- Custom text parsed server-side: scene description vs text overlay request
- Overlay text: NOT translated, NOT sent to AI, applied as sharp SVG composite
- Preserves exact text (Armenian, Russian, English) with pixel-perfect typography
- Amazon Translate: scene description portion only, auto-detect source language
