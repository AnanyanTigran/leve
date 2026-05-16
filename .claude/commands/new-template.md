# Command: new-template

Add a new AI generation template to the LEVE template registry.

## Usage
```
/new-template <templateId> <category> [description]
```

## What to Generate

Entry in `packages/types/src/templates.ts`

## Template Schema

```typescript
{
  id: '<templateId>',                    // snake_case, unique
  category: 'beauty' | 'retail' | 'marketplace' | 'jewelry' | 'food',
  name: {
    hy: '',                              // Armenian name (required)
    ru: '',                              // Russian name (required)
    en: '',                              // English name (required)
  },
  stylePrompt: '',                       // Positive style description (be specific)
  negativePromptAddition: '',            // Additional negatives beyond GLOBAL_NEGATIVE
  suitableFor: string[],                 // product types this works well for
  outputBackground: 'auto' | 'white' | 'dark' | 'gradient',
  padding: number,                       // 0.0-0.3, product padding as fraction of frame
  // Only for marketplace templates:
  complianceSpec?: {
    provider: 'wildberries' | 'ozon',
    requiredBackground: 'white',
    minWidth: number,
    minHeight: number,
    maxPaddingPercent: number,
  }
}
```

## Rules for Good Templates

1. **Specificity wins.** "luxury cosmetics studio, marble surface, soft backlight, gold accents" beats "beautiful product shot."
2. **Always include surface/environment.** Tell the model WHERE the product sits.
3. **Include lighting description.** "soft diffused light" vs "hard rim lighting" produces very different results.
4. **Test for product shape preservation.** Run template against a jewelry test image. If product shape is distorted, add "preserve product shape, maintain exact proportions" to stylePrompt.
5. **Marketplace templates must have white background enforced.** No exceptions — Wildberries/Ozon reject colored backgrounds.
6. **Name must be recognizable to Armenian SME.** "Luxury Beauty" not "Premium Cosmetic Studio High-End".
