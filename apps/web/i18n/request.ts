import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED = ['hy', 'ru', 'en'] as const
type SupportedLocale = typeof SUPPORTED[number]

function isSupported(v: string | undefined): v is SupportedLocale {
  return SUPPORTED.includes(v as SupportedLocale)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('leve_locale')?.value
  // Default must stay in sync with getCurrentLocale() fallbacks in
  // language-switcher.tsx / user-menu.tsx — primary market is Armenian.
  const locale: SupportedLocale = isSupported(raw) ? raw : 'hy'

  const messageMap = {
    hy: () => import('../messages/hy.json'),
    ru: () => import('../messages/ru.json'),
    en: () => import('../messages/en.json'),
  }

  return {
    locale,
    messages: (await messageMap[locale]()).default,
  }
})
