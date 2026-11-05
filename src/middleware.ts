import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/api/auth"];
// Keeps the login URL clean: the page to return to after sign-in travels in a
// short-lived cookie instead of a ?callbackUrl= query string. Read by LoginForm.
const RETURN_TO_COOKIE = "nv_return_to";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Static assets / next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Auth.js prefixes the session cookie with __Secure- on HTTPS; getToken must
  // look for that name or every protected route bounces to /login in production.
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });

  if (!token?.id || token.status === "DISABLED") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const res = NextResponse.redirect(url);
    const returnTo = pathname + req.nextUrl.search;
    if (returnTo !== "/") {
      res.cookies.set(RETURN_TO_COOKIE, returnTo, { path: "/", maxAge: 600, sameSite: "lax" });
    } else {
      res.cookies.delete(RETURN_TO_COOKIE);
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
