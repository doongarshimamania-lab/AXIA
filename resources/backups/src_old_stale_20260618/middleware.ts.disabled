import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware handles SPA routing for the TIMELock Vite app
// It serves /timelock/index.html for all /timelock/* routes that don't match static assets
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle /timelock/* routes for SPA fallback
  if (pathname.startsWith('/timelock/')) {
    // Let static assets pass through (assets/, logo files, etc.)
    if (
      pathname.startsWith('/timelock/assets/') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.pdf') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.woff') ||
      pathname.endsWith('.woff2')
    ) {
      return NextResponse.next()
    }

    // For all other /timelock/* routes, serve the SPA index.html
    // This enables client-side routing within the Vite app
    const url = request.nextUrl.clone()
    url.pathname = '/timelock/index.html'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/timelock/:path*'],
}
