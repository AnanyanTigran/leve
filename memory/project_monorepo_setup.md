---
name: project-monorepo-setup
description: Monorepo structure and tech stack for LEVE — what's where and how it's wired
metadata:
  type: project
---

Monorepo initialized at `/Users/fr13nd/Desktop/Apps/leve/leve` with npm workspaces.

**Structure:**
- `apps/web/` — Next.js 14.2 App Router, TypeScript, Tailwind v3, next-themes
- `apps/api/` — Fastify 4, TypeScript, BullMQ, Prisma, ioredis, zod env validation
- `packages/types/` — shared TypeScript types (domain models, API shapes)
- `packages/config/` — shared tsconfig.base.json
- `docker-compose.yml` — PostgreSQL 16 + Redis 7 for local dev

**Web routes (App Router group `(app)`):**
- `/intent` → intent selection (3 entry types)
- `/upload` → photo upload
- `/templates` → template picker
- `/processing` → AI generation loading state
- `/results` → 2×2 variant grid + before/after slider
- `/download` → HD download + phone capture
- `/history` → past generations

**Design system:** CSS variables in `styles/globals.css`, mapped to Tailwind in `tailwind.config.ts`. Light + dark mode variables. Accent color #D64C1A (Armenian apricot vermillion — culturally deliberate).

**Run dev:** `npm run dev` from root (starts web on :3000). API: `npm run dev:api` (port :3001).

**Why:** Confirmed working — `npm run dev` serves 200 on / (redirects to /intent) and /intent as of 2026-05-16.
