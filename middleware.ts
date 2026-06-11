import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeHeaderName,
} from "@/lib/i18n/config";

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function isBypassedPath(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    isAdminPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  );
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Kunj Kirtans CMS"',
    },
  });
}

function invalidAdminConfigResponse() {
  return new NextResponse("ADMIN_USERNAME or ADMIN_PASSWORD is not configured", {
    status: 500,
  });
}

function enforceHttpsForAdmin(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const hostname = request.nextUrl.hostname;

  if (isLocalHostname(hostname)) {
    return null;
  }

  if (request.nextUrl.protocol === "https:" || forwardedProto === "https") {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";

  return NextResponse.redirect(redirectUrl, 307);
}

function isAuthorizedAdminRequest(request: NextRequest) {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return { ok: false as const, response: invalidAdminConfigResponse() };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return { ok: false as const, response: unauthorizedResponse() };
  }

  try {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const providedUsername =
      separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    const providedPassword =
      separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";

    if (providedUsername === username && providedPassword === password) {
      return { ok: true as const };
    }
  } catch {
    return { ok: false as const, response: unauthorizedResponse() };
  }

  return { ok: false as const, response: unauthorizedResponse() };
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isAdminPath(pathname) || isAdminApiPath(pathname)) {
    const httpsRedirect = enforceHttpsForAdmin(request);
    if (httpsRedirect) {
      return httpsRedirect;
    }

    const auth = isAuthorizedAdminRequest(request);
    if (!auth.ok) {
      return auth.response;
    }
  }

  if (isAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  const [, maybeLocale] = pathname.split("/");

  if (!maybeLocale || !isLocale(maybeLocale)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      pathname === "/" ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`;
    redirectUrl.search = search;
    return NextResponse.redirect(redirectUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(localeHeaderName, maybeLocale);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
