# Command: check-scope

Verify whether a feature or task is in V1 scope before implementing it.

## Usage
```
/check-scope <feature description>
```

## V1 IN SCOPE ✅

- Photo upload (JPEG, PNG, WEBP, max 20MB)
- Image validation (type, size, dimensions, content moderation)
- 6 product category cards (Beauty, Jewelry, Fashion, Food, Marketplace, Custom)
- Phone OR email OTP registration (/register page) — required before first generation
- Template selection (10 hero templates)
- Category pre-filter on template tabs (reads leve_category from sessionStorage)
- Style refinement chips + custom text panel (RefinementPanel component)
- AI preview generation (4 variants, fal.ai FLUX.1-schnell)
- AI HD generation (1 output, fal.ai FLUX.1-dev or Replicate IP-Adapter)
- Armenian/Russian text overlays (price tag, "Sale", "New Collection")
- Before/After reveal slider
- Watermarked preview (low-res, LEVE stamp)
- HD download (unlocked via payment)
- Idram payment integration
- Telcell payment integration
- Session-based credit tracking (Redis)
- Phone number capture (optional, post-first-generation)
- Platform export picker (8 platforms: Instagram feed/story, Facebook, WB, Ozon, Telegram, list.am, Original HD)
- CREDIT_PACKAGES: Starter (1500֏/5), Creator (4000֏/20), Monthly (12000֏/50)
- next-intl localisation with cookie-based locale (hy/ru/en), LanguageSwitcher component
- Session persistence (48h anonymous, 30d phone-captured)
- Rate limiting (10 uploads/hour for anonymous)
- Basic error states (invalid image, generation failure, payment failure)
- Mobile-first responsive design (390px primary)
- Armenian (HY) + Russian (RU) + English (EN) UI strings

## V1 OUT OF SCOPE ❌ (Do not implement)

- Persistent user accounts (V1 uses session-only; phone/email is for session recovery, not a login system)
- Password reset
- Brand kit / saved brand styles
- Caption / copywriting generator
- Multi-platform export (Instagram story sizing, Telegram format, etc.)
- Video generation / animated promos
- Agency workspace / multi-client management
- Team collaboration features
- Analytics dashboard / performance metrics
- Social calendar / content planning
- Holiday template automation
- Marketplace API integrations (direct upload to Wildberries)
- Smart pricing overlays
- AI-generated hashtags
- Bulk SKU processing (V2)
- Subscription billing (V2)
- Push notifications
- Desktop-optimized layouts (mobile-first only in V1)

## Decision Rule

If unsure: ask "does this directly serve the 30-second studio visit core flow?" If no → V2.
If it's V2: add a TODO comment with the V2 feature flag and move on.
