import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedPaths = ["/dashboard", "/admin"];
const authPaths = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Profil public : /@username → /u/username (un segment de route Next
  // ne peut pas commencer par @, réservé aux parallel routes)
  const profileMatch = pathname.match(/^\/@([a-zA-Z0-9._-]+)$/);
  if (profileMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/u/${profileMatch[1]}`;
    const res = NextResponse.rewrite(url);
    addSecurityHeaders(res, pathname);
    return res;
  }

  const token = req.cookies.get("session")?.value;
  let authed = false;

  if (token && process.env.JWT_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      authed = true;
    } catch {
      // Token invalid — clear it and let the request through
      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
      if (isProtected) {
        const res = NextResponse.redirect(new URL("/login", req.url));
        res.cookies.set("session", "", { maxAge: 0, path: "/" });
        return res;
      }
      // For non-protected paths (including /login), clear cookie and proceed
      const res = NextResponse.next();
      res.cookies.set("session", "", { maxAge: 0, path: "/" });
      addSecurityHeaders(res, pathname);
      return res;
    }
  }

  // CSRF protection on API mutations (except webhooks)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/webhooks")) {
    const method = req.method;
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
        }
      }
    }
  }

  // Protected routes: redirect to login if not authenticated
  if (protectedPaths.some((p) => pathname.startsWith(p)) && !authed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Auth pages: redirect to dashboard if already logged in
  if (authPaths.some((p) => pathname.startsWith(p)) && authed) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const res = NextResponse.next();
  addSecurityHeaders(res, pathname);
  return res;
}

function addSecurityHeaders(res: NextResponse, pathname: string) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  if (pathname.startsWith("/pay")) {
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
    // img-src https: — les pages de paiement affichent le logo personnalisé
    // du vendeur (PaymentLink.logoUrl), hébergé sur un domaine externe
    res.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; frame-src https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://maps.googleapis.com; font-src 'self'; frame-ancestors 'self'");
  } else if (pathname.startsWith("/api")) {
    res.headers.set("X-Frame-Options", "DENY");
  } else {
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com; frame-src https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.stripe.com; connect-src 'self' https://api.stripe.com https://va.vercel-scripts.com; font-src 'self'; frame-ancestors 'none'");
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.well-known).*)"] };
