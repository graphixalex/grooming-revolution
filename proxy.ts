import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/register",
  "/api/public",
  "/book",
  "/legal",
  "/terms-and-conditions",
  "/privacy-policy",
  "/refund-policy",
  "/_next",
  "/favicon.ico",
  "/opengraph-image",
  "/twitter-image",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isHome = pathname === "/";
  const isPublic = isHome || publicRoutes.some((route) => pathname.startsWith(route));

  if (!isPublic) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

