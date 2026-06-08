# Command: check-scope

Verify whether a feature or task is in V1 scope before implementing it.

## Usage
```
/check-scope <feature description>
```

## V1 IN SCOPE ✅

- Photo upload (JPEG, PNG, WEBP, max 20MB) — anonymous allowed, no OTP needed
- Image validation (type, size, dimensions, content moderation)
- 2 free anonymous watermarked generations before OTP wall
- 8 product category cards (Beauty, Jewelry, Fashion, Food, Electronics, Home Decor, Toys, Custom)
- Marketplace compliance mode (WB/Ozon toggle) — replaces marketplace_export category
- Phone OR email OTP registration — required before HD download (NOT before generation)
- 2 free HD download credits granted on OTP verification
- 36-scene library across 5 groups (Studio, Lifestyle Surfaces, Environment, Seasonal, Creative)
- Category → scene filtering (6-8 relevant scenes first, "Show all" expands to 36)
- 4 universal refinement chip groups (Lighting, Angle, Mood, Format/aspect ratio)
- Category-specific refinement chips
- Aspect ratio picker BEFORE generation (1:1, 4:5, 3:4, 9:16, 16:9)
- Single generated image output (not 4 variants)
- Iterative editing: "Edit" button sends generated image + instruction back to Kontext
- AI generation via FLUX.1 Kontext [pro] only — no schnell, no dev, no Replicate
- Server-side custom text detection — text overlay requests applied via sharp SVG composite, NOT sent to AI
- Armenian/Russian text translation via Amazon Translate before prompt injection
- Armenian/Russian/English text overlays (price tag, "Sale", "New Collection", custom)
- Before/After reveal slider
- Watermarked preview (anonymous: 1024px, verified: 2048px)
- HD download = same file, no watermark, CloudFront signed URL
- Idram payment integration
- Telcell payment integration
- Persistent User model (phone/email identity, credits survive session expiry)
- Brand name capture after OTP (optional, stored in User record)
- Favorite scene persistence (stored in User record)
- Session-based credit tracking (Redis) + User record for persistence
- Platform export picker (8 platforms: Instagram feed/story, Facebook, WB, Ozon, Telegram, list.am, Original HD)
- CREDIT_PACKAGES: Starter (1500֏/5), Creator (4000֏/20), Monthly (12000֏/50 — show price only)
- next-intl localisation with cookie-based locale (hy/ru/en), LanguageSwitcher component
- Session persistence (48h anonymous, 30d phone-captured)
- Rate limiting (10 uploads/hour for anonymous)
- Basic error states (invalid image, generation failure, payment failure)
- Mobile-first responsive design (390px primary)
- Armenian (HY) + Russian (RU) + English (EN) UI strings

## V1 OUT OF SCOPE ❌ (Do not implement)

- Password / email+password signup
- Google / Apple OAuth
- Persistent user accounts with password reset
- Brand Kit (logo, font palette) — brand NAME only in V1
- Caption / copywriting generator
- Multi-product scene upload
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
- Full subscription billing (V2) — show Monthly price, no billing in V1
- Push notifications
- Desktop-optimized layouts (mobile-first only in V1)

## Decision Rule

If unsure: ask "does this directly serve the 30-second studio visit core flow?" If no → V2.
If it's V2: add a TODO comment with the V2 feature flag and move on.
