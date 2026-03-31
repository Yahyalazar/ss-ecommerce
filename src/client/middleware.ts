import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/orders",
  "/support",
  "/payment-success",
  "/cancel",
  "/failure",
];

const authRoutes = ["/sign-in", "/sign-up"];

const hasProtectedPrefix = (pathname: string) =>
  protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

const hasAuthPrefix = (pathname: string) =>
  authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

const buildRedirectUrl = (request: NextRequest, path: string) => {
  const url = new URL(path, request.url);

  if (path === "/sign-in" && request.nextUrl.pathname !== "/sign-in") {
    const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirect", redirectTo);
  }

  return url;
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const isAuthenticated = Boolean(accessToken || refreshToken);

  if (hasProtectedPrefix(pathname) && !isAuthenticated) {
    return NextResponse.redirect(buildRedirectUrl(request, "/sign-in"));
  }

  if (hasAuthPrefix(pathname) && isAuthenticated) {
    const redirectTarget =
      request.nextUrl.searchParams.get("redirect") || "/dashboard";

    return NextResponse.redirect(buildRedirectUrl(request, redirectTarget));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/orders/:path*",
    "/support/:path*",
    "/payment-success",
    "/cancel",
    "/failure",
    "/sign-in",
    "/sign-up",
  ],
};
