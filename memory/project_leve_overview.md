---
name: project-leve-overview
description: Core product context for LEVE — what it is, target market, V1 scope, and critical business rules
metadata:
  type: project
---

LEVE is a verticalized AI creative engine for Armenian SMEs. Transforms mobile product photos into studio-grade marketing visuals. V1 targets retail, beauty, and marketplace sellers (Wildberries/Ozon).

**Core flow:** Upload photo → select intent → select template → get 4 AI variants (preview, free) → pay to download HD.

**Why:** Armenian micro-businesses can't afford studio photography. LEVE does it in <30s for a few hundred AMD.

**How to apply:** Every feature decision should map to this flow. V2 features (accounts, analytics, bulk, video) are explicitly out of scope — reject them.

Key business rules:
- Never charge credits before job completes — deduct only on success, atomic Redis MULTI/EXEC
- 2 free watermarked previews, then paywall
- Never show Pro plan before 3 purchases
- Session identity captured post-generation (phone OTP), never before
- All AI calls go through model-router, never call fal/replicate directly from routes
- Idram webhooks are form-encoded (not JSON) — always validate signature before adding credits
- Payment idempotency: 7-day Redis key per paymentId

**Market:** Armenian micro-businesses, Instagram boutiques, Wildberries sellers, beauty clinics, jewelry shops.
**Primary currency:** AMD (Armenian Dram, ֏)
**Locales:** hy (Armenian) primary, ru, en secondary
