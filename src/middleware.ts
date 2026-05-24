import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedPaths = ["/dashboard", "/admin"];
const authPaths = ["/login", "/register"];
const adminPaths = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  let authed = false;
  let userRole: string | null = null;

  if (token && process.env.JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      authed = true;
      userRole = (payload.role as string) || null;
    } catch {}
  }

  if (protectedPaths.some((p) => pathname.startsWith(p)) && !authed)
    return NextResponse.redirect(new URL("/login", req.url));

  if (adminPaths.some((p) => pathname.startsWith(p)) && authed) {
    if (userRole !== "ADMIN" && userRole !== "ADMIN_OWNER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (authPaths.some((p) => pathname.startsWith(p)) && authed)
    return NextResponse.redirect(new URL("/dashboard", req.url));

  if (pathname.startsWith("/verify-email")) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  }

  const res = NextResponse.next();
  addSecurityHeaders(res);
  return res;
}

function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.well-known).*)"] };
