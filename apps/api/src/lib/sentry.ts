import * as Sentry from '@sentry/node'

export function initSentry(dsn: string | undefined) {
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.1,
  })
}

export { Sentry }
