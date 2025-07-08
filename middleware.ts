import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Exclude NextAuth routes while keeping other API routes accessible
    '/((?!api|_next|.*\\..*).*)',

    // Enable locale redirection at the root
    '/',

    // Set a cookie to remember the previous locale for all requests with a locale prefix
    '/(xh|en)/:path*',
  ],
};
