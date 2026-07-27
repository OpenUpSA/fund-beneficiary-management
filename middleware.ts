import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const intlMiddleware = createMiddleware(routing);

// Top-level route groups under app/[locale]/(protected)/ — keep in sync.
const PROTECTED_PATHS = ['dashboard', 'account', 'form-preview'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Auth must be enforced here, not only in the (protected) layout: layouts
  // don't re-run on client-side navigation, so a signed-out user could still
  // reach cached protected pages whose data fetches then fail.
  const locale = routing.locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  const pathWithoutLocale = locale ? pathname.slice(locale.length + 1) || '/' : pathname;
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathWithoutLocale === `/${p}` || pathWithoutLocale.startsWith(`/${p}/`)
  );

  if (isProtected) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(
        new URL(`/${locale ?? routing.defaultLocale}/sign-in`, req.url)
      );
    }
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
