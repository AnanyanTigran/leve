import type { Locale } from '@leve/types'

export const DEFAULT_LOCALE: Locale = 'hy'

export const SUPPORTED_LOCALES: Locale[] = ['hy', 'ru', 'en']

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const MAX_UPLOAD_SIZE_MB = 20
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const FREE_PREVIEW_COUNT = 2

export const FREE_CREDITS_AFTER_VERIFICATION = 3

export const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'

export const ROUTES = {
  HOME: '/',
  REGISTER: '/register',
  UPLOAD: '/upload',
  TEMPLATES: '/templates',
  PROCESSING: '/processing',
  RESULTS: '/results',
  DOWNLOAD: '/download',
  HISTORY: '/history',
} as const

export const CATEGORY_CONFIG = {
  beauty_cosmetics: {
    id: 'beauty_cosmetics',
    label: 'Beauty & Cosmetics',
    labelHY: 'Գեղեցկություն',
    labelRU: 'Красота и косметика',
    icon: 'Sparkles',
    basePrompt: 'professional product photography of beauty or cosmetic product, preserve exact packaging design and label text, color-accurate, soft diffused studio lighting, clean luxury aesthetic, sharp product focus',
    negativeAddition: 'distorted packaging, unreadable labels, incorrect colors',
    refinementChips: [
      { id: 'bg_marble', label: 'Marble', prompt: 'marble surface background' },
      { id: 'bg_white', label: 'Clean White', prompt: 'pure white studio background' },
      { id: 'bg_dark', label: 'Dark Luxury', prompt: 'dark dramatic background, moody lighting' },
      { id: 'mood_luxury', label: 'Luxury', prompt: 'high-end luxury editorial style' },
      { id: 'mood_minimal', label: 'Minimal', prompt: 'minimalist clean composition' },
      { id: 'mood_warm', label: 'Warm', prompt: 'warm golden hour indoor lighting' },
    ],
  },
  jewelry_accessories: {
    id: 'jewelry_accessories',
    label: 'Jewelry & Accessories',
    labelHY: 'Զարդեր',
    labelRU: 'Ювелирные украшения',
    icon: 'Gem',
    basePrompt: 'professional macro jewelry photography, preserve exact metal texture and reflections, maintain stone clarity and sparkle, sharp detail focus, studio rim lighting',
    negativeAddition: 'blurry stones, distorted metal, incorrect proportions, melted edges',
    refinementChips: [
      { id: 'bg_velvet', label: 'Dark Velvet', prompt: 'dark velvet surface, dramatic lighting' },
      { id: 'bg_marble', label: 'Marble', prompt: 'white marble surface' },
      { id: 'bg_mirror', label: 'Mirror', prompt: 'reflective mirror surface, symmetrical reflection' },
      { id: 'light_dramatic', label: 'Dramatic', prompt: 'hard rim lighting, deep shadows, high contrast' },
      { id: 'light_soft', label: 'Soft', prompt: 'soft diffused lighting, gentle shadows' },
      { id: 'mood_luxury', label: 'Luxury', prompt: 'luxury editorial jewelry campaign style' },
    ],
  },
  fashion_clothing: {
    id: 'fashion_clothing',
    label: 'Fashion & Clothing',
    labelHY: 'Նորաձևություն',
    labelRU: 'Мода и одежда',
    icon: 'Shirt',
    basePrompt: 'professional fashion product photography, preserve fabric texture and color accuracy, maintain garment shape and drape, commercial fashion aesthetic',
    negativeAddition: 'distorted clothing, incorrect colors, wrinkled unrealistically',
    refinementChips: [
      { id: 'style_editorial', label: 'Editorial', prompt: 'fashion magazine editorial style, dynamic composition' },
      { id: 'style_boutique', label: 'Boutique', prompt: 'luxury boutique display, elegant minimal styling' },
      { id: 'style_lifestyle', label: 'Lifestyle', prompt: 'lifestyle context, natural setting, aspirational feel' },
      { id: 'bg_studio', label: 'Studio', prompt: 'clean studio background, professional fashion shoot' },
      { id: 'bg_outdoor', label: 'Outdoor', prompt: 'outdoor natural background, lifestyle context' },
    ],
  },
  food_cafe: {
    id: 'food_cafe',
    label: 'Food & Cafe',
    labelHY: 'Սնունդ & Սրճարան',
    labelRU: 'Еда и кафе',
    icon: 'Coffee',
    basePrompt: 'professional food photography, appetizing presentation, warm natural lighting, preserve food details and fresh appearance, restaurant-quality styling',
    negativeAddition: 'unappetizing, cold colors, artificial looking food, distorted proportions',
    refinementChips: [
      { id: 'style_restaurant', label: 'Restaurant', prompt: 'fine dining restaurant presentation, elegant plating' },
      { id: 'style_cafe', label: 'Cafe', prompt: 'cozy cafe atmosphere, warm ambient lighting' },
      { id: 'style_flat', label: 'Flat Lay', prompt: 'overhead flat lay composition, styled food photography' },
      { id: 'mood_warm', label: 'Warm', prompt: 'warm golden lighting, inviting atmosphere' },
      { id: 'mood_fresh', label: 'Fresh', prompt: 'bright natural lighting, fresh clean aesthetic' },
    ],
  },
  marketplace_export: {
    id: 'marketplace_export',
    label: 'Marketplace & Export',
    labelHY: 'Մարքեթփլեյս',
    labelRU: 'Маркетплейс',
    icon: 'Package',
    basePrompt: 'marketplace product photography, pure white background mandatory, centered product, even studio lighting, no shadows, compliant with marketplace image standards',
    negativeAddition: 'colored background, gradient background, shadows, lifestyle elements, text',
    refinementChips: [
      { id: 'platform_wb', label: 'Wildberries', prompt: 'Wildberries marketplace standard, white background, 15% padding, 900x1200 proportion' },
      { id: 'platform_ozon', label: 'Ozon', prompt: 'Ozon marketplace standard, white background, centered, square format' },
      { id: 'style_hero', label: 'Hero Shot', prompt: 'hero product shot, slight lifestyle accent, premium positioning' },
      { id: 'style_clean', label: 'Ultra Clean', prompt: 'ultra clean white background, no elements, pure product focus' },
    ],
  },
  custom: {
    id: 'custom',
    label: 'Custom / Other',
    labelHY: 'Այլ',
    labelRU: 'Другое',
    icon: 'Wand2',
    basePrompt: 'professional commercial product photography, studio quality lighting, sharp focus on product, preserve product shape and details',
    negativeAddition: 'distorted product, unrealistic proportions',
    refinementChips: [
      { id: 'bg_white', label: 'White', prompt: 'white studio background' },
      { id: 'bg_dark', label: 'Dark', prompt: 'dark dramatic background' },
      { id: 'bg_natural', label: 'Natural', prompt: 'natural lifestyle background' },
      { id: 'mood_luxury', label: 'Luxury', prompt: 'luxury editorial style' },
      { id: 'mood_minimal', label: 'Minimal', prompt: 'minimalist clean style' },
    ],
  },
} as const

export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    labelHY: 'Սկսնակ',
    labelRU: 'Стартовый',
    label: 'Starter',
    priceAMD: 1500,
    images: 5,
    perImageAMD: 300,
    isMonthly: false,
  },
  {
    id: 'creator',
    labelHY: 'Ստեղծող',
    labelRU: 'Создатель',
    label: 'Creator',
    priceAMD: 4000,
    images: 20,
    perImageAMD: 200,
    isMonthly: false,
  },
  {
    id: 'monthly',
    labelHY: 'Ամսական',
    labelRU: 'Ежемесячный',
    label: 'Monthly',
    priceAMD: 12000,
    images: 50,
    perImageAMD: 240,
    isMonthly: true,
  },
] as const
