import type {
  ProductCategory,
  Scene,
  RefinementChip,
  CategorySceneMap,
  AspectRatioOption,
} from '@leve/types'
import { Sparkles, Gem, Shirt, UtensilsCrossed, Wand2, Monitor, Home, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const CATEGORY_ITEMS: { id: ProductCategory; icon: LucideIcon; tKey: string }[] = [
  { id: 'beauty_cosmetics',    icon: Sparkles, tKey: 'category_beauty' },
  { id: 'jewelry_accessories', icon: Gem,      tKey: 'category_jewelry' },
  { id: 'fashion_clothing',    icon: Shirt,    tKey: 'category_fashion' },
  { id: 'food_cafe',           icon: UtensilsCrossed, tKey: 'category_food' },
  { id: 'electronics_gadgets', icon: Monitor,         tKey: 'category_electronics' },
  { id: 'home_decor',          icon: Home,            tKey: 'category_home_decor' },
  { id: 'toys_children',       icon: Star,            tKey: 'category_toys' },
  { id: 'custom',              icon: Wand2,    tKey: 'category_custom' },
]

export const DEFAULT_LOCALE = 'en' as const

export const SUPPORTED_LOCALES = ['hy', 'ru', 'en'] as const

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const MAX_UPLOAD_SIZE_MB = 20
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const FREE_CREDITS_AFTER_VERIFICATION = 2

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

// ─── Scene Library — 30 scenes across 5 groups ────────────────────────────────
// Prompt cores live in apps/api/src/services/prompt.service.ts (BE only)
// FE only needs display metadata and category filtering

export const SCENES: Scene[] = [
  // ── Group 1: Studio Shots ──────────────────────────────────────────────────
  {
    id: 'pure_white_studio',
    group: 'studio',
    name: 'Pure White Studio',
    nameHY: 'Մաքուր սպիտակ ստուդիա',
    nameRU: 'Чистая белая студия',
    thumbnailGradient: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
    bestFor: 'WB / Ozon main image',
  },
  {
    id: 'soft_shadow_studio',
    group: 'studio',
    name: 'Soft Shadow Studio',
    nameHY: 'Փափուկ ստվեր',
    nameRU: 'Мягкая тень',
    thumbnailGradient: 'linear-gradient(135deg, #f8f8f8, #e8e8e8)',
    bestFor: 'WB / Ozon additional images',
  },
  {
    id: 'gray_gradient',
    group: 'studio',
    name: 'Gray Gradient',
    nameHY: 'Մոխրագույն ֆոն',
    nameRU: 'Серый градиент',
    thumbnailGradient: 'linear-gradient(135deg, #d0d0d0, #a0a0a0)',
    bestFor: 'Electronics, home goods',
  },
  {
    id: 'light_box',
    group: 'studio',
    name: 'Light Box',
    nameHY: 'Լուսատուփ',
    nameRU: 'Лайтбокс',
    thumbnailGradient: 'linear-gradient(135deg, #ffffff, #e8f4ff)',
    bestFor: 'Small items, bottles',
  },
  {
    id: 'black_studio',
    group: 'studio',
    name: 'Black Studio',
    nameHY: 'Սև ստուդիա',
    nameRU: 'Чёрная студия',
    thumbnailGradient: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
    bestFor: 'Luxury, perfume, jewelry',
  },

  // ── Group 2: Lifestyle Surfaces ────────────────────────────────────────────
  {
    id: 'marble_luxury',
    group: 'lifestyle_surfaces',
    name: 'Marble Luxury',
    nameHY: 'Մարմար',
    nameRU: 'Мрамор',
    thumbnailGradient: 'linear-gradient(135deg, #f5f0eb, #e8ddd0)',
    bestFor: 'Cosmetics, skincare, perfume',
  },
  {
    id: 'dark_wood',
    group: 'lifestyle_surfaces',
    name: 'Dark Wood',
    nameHY: 'Մուգ փայտ',
    nameRU: 'Тёмное дерево',
    thumbnailGradient: 'linear-gradient(135deg, #4a3728, #2d2118)',
    bestFor: 'Coffee, tea, artisan, food',
  },
  {
    id: 'light_wood',
    group: 'lifestyle_surfaces',
    name: 'Light Wood',
    nameHY: 'Բաց փայտ',
    nameRU: 'Светлое дерево',
    thumbnailGradient: 'linear-gradient(135deg, #e8d5b0, #d4b896)',
    bestFor: 'Home goods, organic, wellness',
  },
  {
    id: 'concrete_industrial',
    group: 'lifestyle_surfaces',
    name: 'Concrete',
    nameHY: 'Բետոն',
    nameRU: 'Бетон',
    thumbnailGradient: 'linear-gradient(135deg, #8a8a8a, #6a6a6a)',
    bestFor: 'Streetwear, tech, craft',
  },
  {
    id: 'linen_fabric',
    group: 'lifestyle_surfaces',
    name: 'Linen Fabric',
    nameHY: 'Կտավ',
    nameRU: 'Льняная ткань',
    thumbnailGradient: 'linear-gradient(135deg, #e8dfc8, #d4c8a8)',
    bestFor: 'Skincare, soap, handmade',
  },
  {
    id: 'velvet_dark',
    group: 'lifestyle_surfaces',
    name: 'Dark Velvet',
    nameHY: 'Մուգ բարձակ',
    nameRU: 'Тёмный бархат',
    thumbnailGradient: 'linear-gradient(135deg, #2d1a2e, #1a0f1f)',
    bestFor: 'Jewelry, watches, premium',
  },
  {
    id: 'silk_white',
    group: 'lifestyle_surfaces',
    name: 'White Silk',
    nameHY: 'Սպիտակ մետաքս',
    nameRU: 'Белый шёлк',
    thumbnailGradient: 'linear-gradient(135deg, #fdfaf7, #f0ebe3)',
    bestFor: 'Wedding, lingerie, perfume',
  },
  {
    id: 'terrazzo',
    group: 'lifestyle_surfaces',
    name: 'Terrazzo',
    nameHY: 'Տերրացո',
    nameRU: 'Терраццо',
    thumbnailGradient: 'linear-gradient(135deg, #f0e8d8, #e0d4c0)',
    bestFor: 'Modern beauty, Gen Z brands',
  },

  // ── Group 3: Environment / Lifestyle Context ───────────────────────────────
  {
    id: 'bathroom_shelf',
    group: 'environment',
    name: 'Bathroom Shelf',
    nameHY: 'Լոգասենյակ',
    nameRU: 'Полка в ванной',
    thumbnailGradient: 'linear-gradient(135deg, #e8f0f4, #d0e4ec)',
    bestFor: 'Skincare, soap, bath',
  },
  {
    id: 'kitchen_counter',
    group: 'environment',
    name: 'Kitchen Counter',
    nameHY: 'Խոհանոց',
    nameRU: 'Кухонная стойка',
    thumbnailGradient: 'linear-gradient(135deg, #f4ede0, #e8ddd0)',
    bestFor: 'Food, cooking, health',
  },
  {
    id: 'vanity_table',
    group: 'environment',
    name: 'Vanity Table',
    nameHY: 'Հայելյան սեղան',
    nameRU: 'Туалетный столик',
    thumbnailGradient: 'linear-gradient(135deg, #f8e8d8, #f0d4c0)',
    bestFor: 'Cosmetics, beauty tools',
  },
  {
    id: 'cafe_table',
    group: 'environment',
    name: 'Cafe Table',
    nameHY: 'Սրճարան',
    nameRU: 'Столик в кафе',
    thumbnailGradient: 'linear-gradient(135deg, #3d2b1a, #2a1e12)',
    bestFor: 'Beverages, snacks, lifestyle',
  },
  {
    id: 'outdoor_garden',
    group: 'environment',
    name: 'Outdoor Garden',
    nameHY: 'Բաց օդ, այգի',
    nameRU: 'Сад на улице',
    thumbnailGradient: 'linear-gradient(135deg, #2d5a27, #1a3a16)',
    bestFor: 'Organic, eco, wellness',
  },
  {
    id: 'office_desk',
    group: 'environment',
    name: 'Office Desk',
    nameHY: 'Գրասեղան',
    nameRU: 'Офисный стол',
    thumbnailGradient: 'linear-gradient(135deg, #e0e8f0, #c8d8e8)',
    bestFor: 'Tech accessories, stationery',
  },
  {
    id: 'bed_pillows',
    group: 'environment',
    name: 'Bed & Pillows',
    nameHY: 'Անկողնի վրա',
    nameRU: 'На кровати',
    thumbnailGradient: 'linear-gradient(135deg, #f8f4f0, #ede8e0)',
    bestFor: 'Sleep products, candles',
  },
  {
    id: 'beach_sand',
    group: 'environment',
    name: 'Beach Sand',
    nameHY: 'Ծովափ',
    nameRU: 'Пляжный песок',
    thumbnailGradient: 'linear-gradient(135deg, #e8d4a0, #d4bc80)',
    bestFor: 'Summer, sunscreen, swimwear',
  },

  // ── Group 4: Seasonal / Promotional ───────────────────────────────────────
  {
    id: 'holiday_new_year',
    group: 'seasonal',
    name: 'Holiday / New Year',
    nameHY: 'Ամանոր',
    nameRU: 'Новый год',
    thumbnailGradient: 'linear-gradient(135deg, #1a3a1a, #0f2010)',
    bestFor: 'December–January',
  },
  {
    id: 'spring_bloom',
    group: 'seasonal',
    name: 'Spring Bloom',
    nameHY: 'Գարնան ծաղիկներ',
    nameRU: 'Весеннее цветение',
    thumbnailGradient: 'linear-gradient(135deg, #f8d4e8, #f0b8d8)',
    bestFor: 'March 8, spring promos',
  },
  {
    id: 'autumn_warm',
    group: 'seasonal',
    name: 'Autumn Warm',
    nameHY: 'Աշուն',
    nameRU: 'Осенняя теплота',
    thumbnailGradient: 'linear-gradient(135deg, #c85a1a, #a04010)',
    bestFor: 'Fall collection, Sep–Nov',
  },
  {
    id: 'summer_fresh',
    group: 'seasonal',
    name: 'Summer Fresh',
    nameHY: 'Ամառ',
    nameRU: 'Летняя свежесть',
    thumbnailGradient: 'linear-gradient(135deg, #80d4f8, #40b8f0)',
    bestFor: 'Summer promotions',
  },
  {
    id: 'sale_promo',
    group: 'seasonal',
    name: 'Sale / Promo',
    nameHY: 'Զեղչ / Ակցիա',
    nameRU: 'Скидка / Промо',
    thumbnailGradient: 'linear-gradient(135deg, #d64c1a, #b03010)',
    bestFor: 'Discount campaigns',
  },

  // ── Group 5: Creative / Editorial ─────────────────────────────────────────
  {
    id: 'floating_levitation',
    group: 'creative',
    name: 'Floating',
    // TODO: [UX] "Lebecouoir" is corrupted text, not Armenian — Armenian users
    // see gibberish for this scene; needs a real translation (e.g. Սավառնող).
    nameHY: 'Lebecouoir',
    nameRU: 'Левитация',
    thumbnailGradient: 'linear-gradient(135deg, #e0e8f8, #c0d0f0)',
    bestFor: 'Hero shots, ads',
  },
  {
    id: 'splash_water',
    group: 'creative',
    name: 'Water Splash',
    nameHY: 'Ջրի շիթ',
    nameRU: 'Всплеск воды',
    thumbnailGradient: 'linear-gradient(135deg, #0080c0, #004080)',
    bestFor: 'Beverages, waterproof',
  },
  {
    id: 'ingredients_flat_lay',
    group: 'creative',
    name: 'Ingredients Flat Lay',
    nameHY: 'Բաղադրիչներ',
    nameRU: 'Ингредиенты сверху',
    thumbnailGradient: 'linear-gradient(135deg, #a8d080, #78b050)',
    bestFor: 'Skincare, food, organic',
  },
  {
    id: 'neon_glow',
    group: 'creative',
    name: 'Neon Glow',
    nameHY: 'Նեոն',
    nameRU: 'Неоновое свечение',
    thumbnailGradient: 'linear-gradient(135deg, #8020f0, #f020a0)',
    bestFor: 'Tech, Gen Z, nightlife',
  },
  {
    id: 'minimal_pastel',
    group: 'creative',
    name: 'Minimal Pastel',
    nameHY: 'Նուրբ գույներ',
    nameRU: 'Пастельный минимал',
    thumbnailGradient: 'linear-gradient(135deg, #f8e8f0, #e8d8e8)',
    bestFor: 'Beauty, wellness, lifestyle',
  },
  {
    id: 'editorial_dark',
    group: 'creative',
    name: 'Editorial Dark',
    nameHY: 'Մուգ ռեդակցիոն',
    nameRU: 'Тёмный эдиториал',
    thumbnailGradient: 'linear-gradient(135deg, #1a1a2e, #0f0f1a)',
    bestFor: 'Luxury brands, fashion',
  },

  // ── Additions (2026-06) — see audit deliverable 3 ─────────────────────────
  {
    id: 'colored_pop',
    group: 'studio',
    name: 'Color Pop',
    nameHY: 'Վառ ֆոն',
    nameRU: 'Цветной фон',
    thumbnailGradient: 'linear-gradient(135deg, #ff7d6b, #2d8a6b)',
    bestFor: 'Bold modern brands, Gen Z',
  },
  {
    id: 'apricot_warm',
    group: 'studio',
    name: 'Apricot Warm',
    nameHY: 'Ծիրանագույն',
    nameRU: 'Абрикосовый',
    thumbnailGradient: 'linear-gradient(135deg, #f4c28a, #d68a4a)',
    bestFor: 'Skincare, jewelry, warm palettes',
  },
  {
    id: 'coffee_jezve',
    group: 'environment',
    name: 'Armenian Coffee',
    nameHY: 'Հայկական սուրճ',
    nameRU: 'Армянский кофе',
    thumbnailGradient: 'linear-gradient(135deg, #3a2418, #1f1208)',
    bestFor: 'Cafes, food, lifestyle',
  },
  {
    id: 'wb_white_strict',
    group: 'studio',
    name: 'Wildberries Ready',
    nameHY: 'WB ստանդարտ',
    nameRU: 'WB стандарт',
    thumbnailGradient: 'linear-gradient(135deg, #ffffff, #f4f1ec)',
    bestFor: 'Wildberries main image',
  },
  {
    id: 'handheld_lifestyle',
    group: 'environment',
    name: 'In Hand',
    nameHY: 'Ձեռքի մեջ',
    nameRU: 'В руке',
    thumbnailGradient: 'linear-gradient(135deg, #e8d4b8, #c8a888)',
    bestFor: 'Beauty, jewelry, small accessories',
  },

  // ── New scenes (2026-06) ─────────────────────────────────────────────────────
  {
    id: 'acrylic_reflect',
    group: 'lifestyle_surfaces',
    name: 'Acrylic Reflect',
    nameHY: 'Ակրիլային մակերես',
    nameRU: 'Акриловая поверхность',
    thumbnailGradient: 'linear-gradient(135deg, #f0f4f8, #dde8f0)',
    bestFor: 'Perfume, serums, premium cosmetics',
  },
  {
    id: 'mirror_acrylic',
    group: 'lifestyle_surfaces',
    name: 'Mirror Surface',
    nameHY: 'Հայելային մակերես',
    nameRU: 'Зеркальная поверхность',
    thumbnailGradient: 'linear-gradient(135deg, #e8eef4, #c8d8e8)',
    bestFor: 'Jewelry, rings, gemstones',
  },
  {
    id: 'stone_texture',
    group: 'lifestyle_surfaces',
    name: 'Natural Stone',
    nameHY: 'Բնական քար',
    nameRU: 'Натуральный камень',
    thumbnailGradient: 'linear-gradient(135deg, #c8c0b8, #a8a098)',
    bestFor: 'Jewelry, artisan, food',
  },
  {
    id: 'dark_stone',
    group: 'lifestyle_surfaces',
    name: 'Dark Stone',
    nameHY: 'Մուգ քար',
    nameRU: 'Тёмный сланец',
    thumbnailGradient: 'linear-gradient(135deg, #3a3530, #201c18)',
    bestFor: 'Gourmet food, chocolate, premium',
  },
  {
    id: 'tech_desk_setup',
    group: 'environment',
    name: 'Tech Desk',
    nameHY: 'Տեխ սեղան',
    nameRU: 'Тех-стол',
    thumbnailGradient: 'linear-gradient(135deg, #1a2030, #0a1020)',
    bestFor: 'Electronics, gadgets, accessories',
  },
  {
    id: 'styled_shelf',
    group: 'environment',
    name: 'Styled Shelf',
    nameHY: 'Դարակ',
    nameRU: 'Стилизованная полка',
    thumbnailGradient: 'linear-gradient(135deg, #e8e0d4, #d4c8b8)',
    bestFor: 'Home decor, candles, vases',
  },

  // ── Gap-analysis scenes (2026-06) ─────────────────────────────────────────
  {
    id: 'podium_pedestal',
    group: 'creative',
    name: 'Podium Display',
    nameHY: 'Պատվանդան',
    nameRU: 'Подиум',
    thumbnailGradient: 'linear-gradient(135deg, #f5ede0, #e8d8c8)',
    bestFor: 'Beauty, perfume, jewelry hero shots',
  },
  {
    id: 'water_ripple',
    group: 'lifestyle_surfaces',
    name: 'Water Ripple',
    nameHY: 'Ջրի ալիք',
    nameRU: 'Водная рябь',
    thumbnailGradient: 'linear-gradient(135deg, #a8d8f0, #6ab8e8)',
    bestFor: 'Beauty, skincare, serums',
  },
  {
    id: 'gift_unboxing',
    group: 'seasonal',
    name: 'Gift Unboxing',
    nameHY: 'Նվեր',
    nameRU: 'Подарок',
    thumbnailGradient: 'linear-gradient(135deg, #e8d4b8, #d4b898)',
    bestFor: 'Gifting, New Year, March 8',
  },
  {
    id: 'silk_pearls',
    group: 'lifestyle_surfaces',
    name: 'Silk & Pearls',
    nameHY: 'Մետաքս ու մարգարիտ',
    nameRU: 'Шёлк и жемчуг',
    thumbnailGradient: 'linear-gradient(135deg, #f8f0e8, #e8d8c8)',
    bestFor: 'Jewelry, bridal, luxury accessories',
  },
  {
    id: 'wb_hero_card',
    group: 'studio',
    name: 'WB Hero Card',
    nameHY: 'WB Hero կառք',
    nameRU: 'Карточка WB Hero',
    thumbnailGradient: 'linear-gradient(135deg, #deeeff, #ffffff)',
    bestFor: 'Wildberries / Ozon card with text space',
  },
  {
    id: 'window_shadow_play',
    group: 'creative',
    name: 'Shadow Play',
    nameHY: 'Ստվերներ',
    nameRU: 'Игра теней',
    thumbnailGradient: 'linear-gradient(135deg, #f8e8c8, #e0c898)',
    bestFor: 'Instagram editorial, fashion, lifestyle',
  },
  {
    id: 'color_block_duo',
    group: 'creative',
    name: 'Colour Block',
    nameHY: 'Գույնի բլոկ',
    nameRU: 'Цветовой блок',
    thumbnailGradient: 'linear-gradient(135deg, #c8582a, #f5ede0)',
    bestFor: 'Social ads, bold product cards',
  },
  {
    id: 'yerevan_tuff',
    group: 'environment',
    name: 'Yerevan Tuff',
    nameHY: 'Երևանյան տուֆ',
    nameRU: 'Ереванский туф',
    thumbnailGradient: 'linear-gradient(135deg, #d4907a, #c07860)',
    bestFor: 'Local brand identity, artisan, heritage',
  },
  {
    id: 'pomegranate_luxe',
    group: 'seasonal',
    name: 'Pomegranate',
    nameHY: 'Նուռ',
    nameRU: 'Гранат',
    thumbnailGradient: 'linear-gradient(135deg, #8b1a1a, #c02020)',
    bestFor: 'Armenian New Year, gifting, artisan food',
  },
]

// ─── Category → Default Scene IDs ─────────────────────────────────────────────
// First 6-8 shown, user taps "Show all" to see all 30

export const CATEGORY_SCENE_MAP: CategorySceneMap = {
  beauty_cosmetics: [
    'marble_luxury',
    'vanity_table',
    'acrylic_reflect',
    'podium_pedestal',
    'water_ripple',
    'handheld_lifestyle',
    'bathroom_shelf',
    'apricot_warm',
    'linen_fabric',
    'soft_shadow_studio',
    'ingredients_flat_lay',
    'wb_hero_card',
  ],
  jewelry_accessories: [
    'black_studio',
    'mirror_acrylic',
    'velvet_dark',
    'marble_luxury',
    'silk_white',
    'podium_pedestal',
    'silk_pearls',
    'handheld_lifestyle',
    'gray_gradient',
    'soft_shadow_studio',
    'apricot_warm',
    'editorial_dark',
    'stone_texture',
    'wb_hero_card',
  ],
  fashion_clothing: [
    'light_wood',
    'concrete_industrial',
    'pure_white_studio',
    'cafe_table',
    'outdoor_garden',
    'linen_fabric',
    'colored_pop',
    'terrazzo',
    'wb_hero_card',
  ],
  food_cafe: [
    'kitchen_counter',
    'dark_wood',
    'coffee_jezve',
    'pomegranate_luxe',
    'dark_stone',
    'cafe_table',
    'ingredients_flat_lay',
    'light_wood',
    'outdoor_garden',
    'summer_fresh',
    'wb_hero_card',
  ],
  electronics_gadgets: [
    'gray_gradient',
    'tech_desk_setup',
    'black_studio',
    'pure_white_studio',
    'office_desk',
    'neon_glow',
    'light_box',
    'soft_shadow_studio',
    'concrete_industrial',
    'wb_hero_card',
  ],
  home_decor: [
    'light_wood',
    'styled_shelf',
    'bed_pillows',
    'marble_luxury',
    'linen_fabric',
    'outdoor_garden',
    'soft_shadow_studio',
    'terrazzo',
    'dark_wood',
    'wb_hero_card',
  ],
  toys_children: [
    'pure_white_studio',
    'soft_shadow_studio',
    'outdoor_garden',
    'light_wood',
    'spring_bloom',
    'linen_fabric',
    'colored_pop',
    'light_box',
    'wb_hero_card',
  ],
  custom: [], // empty = show all scenes with no filtering
}

// ─── Universal Refinement Chips ────────────────────────────────────────────────

export const LIGHTING_CHIPS: RefinementChip[] = [
  { id: 'light_natural',  group: 'lighting', label: 'Natural Light',  labelHY: 'Բնական լույս',    labelRU: 'Естественный свет' },
  { id: 'light_studio',   group: 'lighting', label: 'Studio Soft',    labelHY: 'Ստուդիայի լույս', labelRU: 'Студийный мягкий' },
  { id: 'light_dramatic', group: 'lighting', label: 'Dramatic',       labelHY: 'Դրամատիկ',        labelRU: 'Драматичный' },
  { id: 'light_golden',   group: 'lighting', label: 'Golden Hour',    labelHY: 'Ոսկե ժամ',        labelRU: 'Золотой час' },
  { id: 'light_cool',     group: 'lighting', label: 'Cool Daylight',  labelHY: 'Ցերեկային',       labelRU: 'Дневной холодный' },
]

export const ANGLE_CHIPS: RefinementChip[] = [
  { id: 'angle_front',    group: 'angle', label: 'Front',      labelHY: 'Ճակատ',    labelRU: 'Спереди' },
  { id: 'angle_45',       group: 'angle', label: '45°',        labelHY: '45°',      labelRU: '45°' },
  { id: 'angle_top',      group: 'angle', label: 'Top Down',   labelHY: 'Վերևից',   labelRU: 'Сверху' },
  { id: 'angle_low',      group: 'angle', label: 'Low Angle',  labelHY: 'Ներքևից',  labelRU: 'Снизу' },
  { id: 'angle_closeup',  group: 'angle', label: 'Close-up',   labelHY: 'Մոտ',      labelRU: 'Крупный план' },
]

export const MOOD_CHIPS: RefinementChip[] = [
  { id: 'mood_minimal',  group: 'mood', label: 'Minimal',  labelHY: 'Մինիմալ',   labelRU: 'Минимал' },
  { id: 'mood_luxury',   group: 'mood', label: 'Luxury',   labelHY: 'Շքեղ',      labelRU: 'Люкс' },
  { id: 'mood_warm',     group: 'mood', label: 'Warm',     labelHY: 'Ջերմ',      labelRU: 'Тёплый' },
  { id: 'mood_fresh',    group: 'mood', label: 'Fresh',    labelHY: 'Թարմ',      labelRU: 'Свежий' },
  { id: 'mood_bold',     group: 'mood', label: 'Bold',     labelHY: 'Համարձակ',  labelRU: 'Смелый' },
  { id: 'mood_editorial',group: 'mood', label: 'Editorial',labelHY: 'Խմբագրական',labelRU: 'Эдиториал' },
]

// Brand color accent — six swatches that tint the background and surrounding
// props without overriding the chosen scene. Server-side prompts wrap the
// chip ID into a sentence; see CHIP_PROMPTS in prompt.service.ts.
export const ACCENT_CHIPS: RefinementChip[] = [
  { id: 'accent_cream',    group: 'accent', label: 'Cream',    labelHY: 'Կրեմ',         labelRU: 'Кремовый',  swatch: '#F4E8D4' },
  { id: 'accent_sage',     group: 'accent', label: 'Sage',     labelHY: 'Մարգագետին',   labelRU: 'Шалфей',    swatch: '#A8B89C' },
  { id: 'accent_pink',     group: 'accent', label: 'Pink',     labelHY: 'Վարդագույն',   labelRU: 'Розовый',   swatch: '#E8B8B0' },
  { id: 'accent_blue',     group: 'accent', label: 'Sky',      labelHY: 'Երկնագույն',   labelRU: 'Голубой',   swatch: '#A8C8D8' },
  { id: 'accent_charcoal', group: 'accent', label: 'Charcoal', labelHY: 'Մուգ մոխրագույն', labelRU: 'Угольный', swatch: '#3A3A3A' },
  { id: 'accent_apricot',  group: 'accent', label: 'Apricot',  labelHY: 'Ծիրանագույն',  labelRU: 'Абрикосовый', swatch: '#E8A878' },
]

// ─── Category-Specific Chips ───────────────────────────────────────────────────

export const CATEGORY_CHIPS: Record<ProductCategory, RefinementChip[]> = {
  beauty_cosmetics: [
    { id: 'beauty_flowers',     group: 'category_specific', label: 'With flowers',      labelHY: 'Ծաղիկներով',    labelRU: 'С цветами' },
    { id: 'beauty_water',       group: 'category_specific', label: 'Water drops',       labelHY: 'Ջրի կաթիլներ',  labelRU: 'Капли воды' },
    { id: 'beauty_ingredients', group: 'category_specific', label: 'With ingredients',  labelHY: 'Բաղադրիչներ',   labelRU: 'С ингредиентами' },
    { id: 'beauty_dewy',        group: 'category_specific', label: 'Dewy fresh',        labelHY: 'Թարմ',           labelRU: 'Свежий блеск' },
    { id: 'beauty_matte',       group: 'category_specific', label: 'Matte finish',      labelHY: 'Մատ',            labelRU: 'Матовый' },
  ],
  jewelry_accessories: [
    { id: 'jewelry_macro',      group: 'category_specific', label: 'Macro close-up',    labelHY: 'Մակրո',          labelRU: 'Макро' },
    { id: 'jewelry_reflection', group: 'category_specific', label: 'With reflection',   labelHY: 'Արտացոլումով',   labelRU: 'С отражением' },
    { id: 'jewelry_box',        group: 'category_specific', label: 'Ring box open',     labelHY: 'Բացված տուփ',   labelRU: 'Открытая коробка' },
    { id: 'jewelry_pair',       group: 'category_specific', label: 'Pair display',      labelHY: 'Զույգ',          labelRU: 'Пара' },
  ],
  fashion_clothing: [
    { id: 'fashion_hanger',     group: 'category_specific', label: 'On hanger',         labelHY: 'Կախոցի վրա',    labelRU: 'На вешалке' },
    { id: 'fashion_flatlay',    group: 'category_specific', label: 'Flat lay',           labelHY: 'Հարթ',           labelRU: 'Плоская укладка' },
    { id: 'fashion_folded',     group: 'category_specific', label: 'Folded neatly',     labelHY: 'Ծալված',         labelRU: 'Аккуратно сложено' },
    { id: 'fashion_accessories',group: 'category_specific', label: 'With accessories',  labelHY: 'Աքսեսուարներ',  labelRU: 'С аксессуарами' },
  ],
  food_cafe: [
    { id: 'food_steam',         group: 'category_specific', label: 'Steam rising',      labelHY: 'Գոլորշի',       labelRU: 'С паром' },
    { id: 'food_cut',           group: 'category_specific', label: 'Fresh cut',         labelHY: 'Կտրատված',       labelRU: 'Свежий срез' },
    { id: 'food_cutlery',       group: 'category_specific', label: 'With cutlery',      labelHY: 'Գդալ-պատառաքաղ',labelRU: 'С посудой' },
    { id: 'food_top',           group: 'category_specific', label: 'Top-down flat lay', labelHY: 'Վերևից',         labelRU: 'Вид сверху' },
  ],
  electronics_gadgets: [
    { id: 'elec_packshot',  group: 'category_specific', label: 'Clean packshot',   labelHY: 'Մաքուր կադր',      labelRU: 'Чистый пакшот' },
    { id: 'elec_glow',      group: 'category_specific', label: 'LED glow',         labelHY: 'LED լույս',        labelRU: 'LED-свечение' },
    { id: 'elec_cable',     group: 'category_specific', label: 'With cable',       labelHY: 'Մալուխով',         labelRU: 'С кабелем' },
    { id: 'elec_dark_bg',   group: 'category_specific', label: 'Dark background',  labelHY: 'Մուգ ֆոն',        labelRU: 'Тёмный фон' },
  ],
  home_decor: [
    { id: 'decor_plant',    group: 'category_specific', label: 'With plant',       labelHY: 'Բույսով',          labelRU: 'С растением' },
    { id: 'decor_candle',   group: 'category_specific', label: 'With candle',      labelHY: 'Մոմով',            labelRU: 'Со свечой' },
    { id: 'decor_flatlay',  group: 'category_specific', label: 'Flat lay',         labelHY: 'Հարթ կոմպոզ',     labelRU: 'Флэтлэй' },
    { id: 'decor_natural',  group: 'category_specific', label: 'Natural elements', labelHY: 'Բնական',           labelRU: 'Натуральные элементы' },
  ],
  toys_children: [
    { id: 'toy_flatlay',    group: 'category_specific', label: 'Flat lay',         labelHY: 'Հարթ կոմպոզ',     labelRU: 'Флэтлэй' },
    { id: 'toy_pastel',     group: 'category_specific', label: 'Pastel tones',     labelHY: 'Փափուկ գույներ',  labelRU: 'Пастельные тона' },
    { id: 'toy_colorful',   group: 'category_specific', label: 'Colorful',         labelHY: 'Գունավոր',        labelRU: 'Яркий' },
    { id: 'toy_white_bg',   group: 'category_specific', label: 'White background', labelHY: 'Սպիտակ ֆոն',     labelRU: 'Белый фон' },
  ],
  custom: [],
}

// ─── Aspect Ratio Options ──────────────────────────────────────────────────────

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    id: '1:1',
    label: 'Square',     labelHY: 'Քառակուսի',   labelRU: 'Квадрат',
    description: 'Instagram, Ozon',
    width: 2048, height: 2048,
  },
  {
    id: '4:5',
    label: 'Portrait',   labelHY: 'Դիմանկար',    labelRU: 'Портрет',
    description: 'Instagram feed',
    width: 1638, height: 2048,
  },
  {
    id: '3:4',
    label: 'WB Standard',labelHY: 'WB ձևաչափ',   labelRU: 'WB стандарт',
    description: 'Wildberries',
    width: 1536, height: 2048,
  },
  {
    id: '9:16',
    label: 'Story',      labelHY: 'Ստորի',        labelRU: 'Сторис',
    description: 'Instagram / TikTok Story',
    width: 1152, height: 2048,
  },
  {
    id: '16:9',
    label: 'Banner',     labelHY: 'Բաններ',       labelRU: 'Баннер',
    description: 'Website, Facebook',
    width: 2048, height: 1152,
  },
]

// ─── Credit Packages (FE display) ─────────────────────────────────────────────
// Prices must match apps/api/src/config/credit-packages.ts exactly

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
    id: 'pro_monthly',
    labelHY: 'Ամսական',
    labelRU: 'Ежемесячный',
    label: 'Monthly',
    priceAMD: 12000,
    images: 50,
    perImageAMD: 240,
    isMonthly: true,
  },
] as const

// ─── Helper — get scenes for a category ───────────────────────────────────────

export function getScenesForCategory(
  category: ProductCategory | null,
  showAll: boolean = false,
): Scene[] {
  if (showAll || !category || category === 'custom') return SCENES

  const defaultIds = CATEGORY_SCENE_MAP[category] ?? []
  if (defaultIds.length === 0) return SCENES

  // Return default scenes first (ordered), then remaining scenes after
  const defaultScenes = defaultIds
    .map((id) => SCENES.find((s) => s.id === id))
    .filter((s): s is Scene => s !== undefined)

  return defaultScenes
}

export function getSceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id)
}

export function getAllChipsForCategory(category: ProductCategory): RefinementChip[] {
  const categorySpecific = CATEGORY_CHIPS[category] ?? []
  return [...LIGHTING_CHIPS, ...ANGLE_CHIPS, ...MOOD_CHIPS, ...categorySpecific]
}
