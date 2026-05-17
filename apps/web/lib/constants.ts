import type { Locale } from '@leve/types'

export const DEFAULT_LOCALE: Locale = 'hy'

export const SUPPORTED_LOCALES: Locale[] = ['hy', 'ru', 'en']

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const MAX_UPLOAD_SIZE_MB = 20
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const FREE_PREVIEW_COUNT = 2

export const ROUTES = {
  INTENT: '/intent',
  UPLOAD: '/upload',
  TEMPLATES: '/templates',
  PROCESSING: '/processing',
  RESULTS: '/results',
  DOWNLOAD: '/download',
  HISTORY: '/history',
} as const
