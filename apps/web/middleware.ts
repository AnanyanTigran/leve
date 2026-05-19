import { NextRequest, NextResponse } from 'next/server'

// Cookie-based locale: no URL routing, so we just pass through.
// This middleware exists to satisfy next-intl's runtime expectations
// and to provide a matcher that excludes static assets from processing.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
