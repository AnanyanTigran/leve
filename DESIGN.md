# LEVE Design System

## Brand Identity

LEVE is a dark, minimalist AI creative tool for Armenian SMEs.
Aesthetic direction: **luxury dark studio** — not brutalist, not maximalist.
Think high-end photo studio software. Serious, fast, premium.

## Color Tokens

- Background base: #0A0A0A
- Surface: #141414
- Elevated: #1E1E1E
- Border: #2A2A2A
- Border hover: #3A3A3A
- Accent (Armenian apricot-vermillion): #D64C1A
- Accent hover: #E85A22
- Accent subtle bg: #2A1208
- Text primary: #FFFFFF
- Text secondary: #A0A0A0
- Text muted: #4A4A4A

## Typography

- UI font: Inter
- Display font: Plus Jakarta Sans
- Max 2 font weights per screen: 400 regular + 600 semibold

## Motion

- Fast (micro-interactions): 150ms ease-out
- Default (state changes): 250ms ease-in-out
- Slow (page transitions): 400ms ease-in-out
- Scale on press: 0.97

## Hard Rules — Never Violate

- NO gradients on interactive elements. Solid fills only.
- NO purple, blue, or generic "AI" colors
- NO generic shadows — opacity shadows only (rgba(0,0,0,x))
- Primary CTA: bg-[#D64C1A] solid, white text, no border
- Secondary CTA: border border-[#2A2A2A], no fill, white text
- Touch targets: minimum 48×48px (Armenian users are mobile-only)
- Loading states: always animated skeleton shimmer — never a blank screen
- Do NOT use the word "credits" in UI copy — say "images"

## Aesthetic Direction

- No gradients
- No decorative flourishes
- Atmospheric depth via layered dark surfaces, not color
- Animations are purposeful (they communicate state), never decorative
- The before/after slider is the WOW moment — it must feel premium

## Light Mode Tokens (when theme = light)

- Background base: #FFFFFF
- Surface: #F5F5F5
- Elevated: #EBEBEB
- Border: #E0E0E0
- Border hover: #CCCCCC
- Text primary: #0A0A0A
- Text secondary: #5A5A5A
- Text muted: #9A9A9A
- Accent: #D64C1A (same as dark — works on both)
- Accent hover: #E85A22
- Accent subtle bg: #FDF0EC
- Accent border: #F5C4B5

## Theming

- App supports dark (default) and light modes
- Dark is the primary/default theme
- Use CSS variables for all colors — never hardcode hex values in components
- Accent #D64C1A works in both themes — do not change per theme
- Both themes must render correctly in all components
