import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.leve.am' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
    ],
  },
  async rewrites() {
    // API_INTERNAL_URL is a server-only env var (no NEXT_PUBLIC_ prefix) used as
    // the rewrite destination. It keeps the Railway URL off the client bundle so
    // browser requests always go to /api/* on the same Vercel origin — making all
    // cookies first-party and fixing mobile Safari ITP CSRF failures.
    //
    // Migration: set API_INTERNAL_URL=https://leveapi-production.up.railway.app in
    // Vercel server env vars, then remove NEXT_PUBLIC_API_URL from the build env.
    // Falls back to NEXT_PUBLIC_API_URL for compatibility during the transition,
    // then to localhost for local dev.
    const apiBase =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ]
  },
}

const withIntl = withNextIntl(nextConfig)

// Only wrap with Sentry when DSN is configured
const hasSentryDsn = !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

export default hasSentryDsn
  ? withSentryConfig(withIntl, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      disableLogger: true,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
    })
  : withIntl
