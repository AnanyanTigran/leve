import type {
  ProductCategory,
  Scene,
  RefinementChip,
  CategorySceneMap,
  AspectRatioOption,
} from '@leve/types'

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
]

// ─── Category → Default Scene IDs ─────────────────────────────────────────────
// First 6-8 shown, user taps "Show all" to see all 30

export const CATEGORY_SCENE_MAP: CategorySceneMap = {
  beauty_cosmetics: [
    'marble_luxury',
    'vanity_table',
    'bathroom_shelf',
    'linen_fabric',
    'silk_white',
    'soft_shadow_studio',
    'ingredients_flat_lay',
    'spring_bloom',
  ],
  jewelry_accessories: [
    'black_studio',
    'velvet_dark',
    'marble_luxury',
    'silk_white',
    'floating_levitation',
    'neon_glow',
    'editorial_dark',
    'soft_shadow_studio',
  ],
  fashion_clothing: [
    'light_wood',
    'concrete_industrial',
    'cafe_table',
    'office_desk',
    'spring_bloom',
    'terrazzo',
    'outdoor_garden',
    'editorial_dark',
  ],
  food_cafe: [
    'kitchen_counter',
    'dark_wood',
    'cafe_table',
    'outdoor_garden',
    'splash_water',
    'ingredients_flat_lay',
    'light_wood',
    'summer_fresh',
  ],
  marketplace_export: [
    'pure_white_studio',
    'soft_shadow_studio',
    'gray_gradient',
    'light_box',
    'black_studio',
    'linen_fabric',
  ],
  custom: [], // empty = show all 30 with no filtering
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
  marketplace_export: [
    { id: 'market_padding',     group: 'category_specific', label: '15% padding',       labelHY: '15% դատարկ',    labelRU: '15% отступ' },
    { id: 'market_fill',        group: 'category_specific', label: 'Product fills 85%', labelHY: 'Լրացում 85%',   labelRU: 'Заполнение 85%' },
    { id: 'market_noprops',     group: 'category_specific', label: 'No props',          labelHY: 'Առանց ռեկվիզիտ',labelRU: 'Без реквизита' },
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
