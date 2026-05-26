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
  const locale: SupportedLocale = isSupported(raw) ? raw : 'en'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
