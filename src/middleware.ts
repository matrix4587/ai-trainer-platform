import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware — runs on every request BEFORE the page loads.
 * Redirects unauthenticated users away from protected routes.
 *
 * Note: this is a fast first line of defence. Server-side guards
 * (requireUser, requireRole) enforce permissions again per-route.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Public routes that don't need auth ────────────────
  const publicPaths = [
    "/",
    "/about",
    "/how-it-works",
    "/for-workers",
    "/for-companies",
    "/pricing",
    "/faq",
    "/login",
    "/register",
    "/verify-email",
    "/verify-email-pending",
    "/reset-password",
    "/request-reset",
    "/privacy",
    "/terms",
  ];

  const isAuthApiRoute =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public");

  // ─── Protected prefixes ────────────────────────────────
  const protectedPrefixes = [
    "/dashboard",
    "/profile",
    "/assessments",
    "/capabilities",
    "/tasks",
    "/earnings",
    "/wallet",
    "/withdrawals",
    "/notifications",
    "/settings",
    "/onboarding",
    "/admin",
    "/client",
  ];

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isAuthApiRoute || !isProtected) {
    return NextResponse.next();
  }

  // ─── Check the auth token ──────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public file extensions (png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};