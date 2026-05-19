import { NextResponse } from 'next/server'

// Cookie-based locale: no URL routing, passthrough only.
// Provides a matcher that excludes static assets from processing.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
