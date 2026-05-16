# Command: new-component

Scaffold a new UI component for LEVE following the design system and conventions.

## Usage
```
/new-component <ComponentName> [description]
```

## What to Generate

1. `apps/web/components/<ComponentName>.tsx` — the component
2. `apps/web/components/<ComponentName>.test.tsx` — basic render test

## Component Template

```tsx
'use client'  // only if needed for interactivity

import { cn } from '@/lib/utils'

interface <ComponentName>Props {
  className?: string
  // Add props here
}

export function <ComponentName>({ className, ...props }: <ComponentName>Props) {
  return (
    <div className={cn('', className)}>
      {/* Component content */}
    </div>
  )
}
```

## Rules to Follow

- Use LEVE design tokens (see CLAUDE.md Design System section)
- Mobile-first: start at 390px, scale up
- No hardcoded strings — use translation keys
- Touch targets minimum 48x48px
- Accessible: proper ARIA labels, keyboard navigation
- Export as named export (not default)
- Keep under 150 lines — split if larger

## Design Checklist Before Finalizing

- [ ] Background uses `bg-[#0A0A0A]`, `bg-[#141414]`, or `bg-[#1E1E1E]`
- [ ] Primary text is `text-white`
- [ ] Secondary text is `text-[#A0A0A0]`
- [ ] CTAs use `bg-[#D4A853]` (gold) or `border border-[#2A2A2A]`
- [ ] No gradients on interactive elements
- [ ] Loading state handled (skeleton or spinner — NOT blank)
- [ ] Error state handled
