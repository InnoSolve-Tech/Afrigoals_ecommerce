import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export default async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/signin") {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/signin";
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }

    try {
      const authResponse = await fetch(new URL("/api/auth/me", req.url), {
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      });
      const user = await authResponse.json().catch(() => null);

      if (!authResponse.ok || user?.role !== "admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/signin";
        url.searchParams.set("next", pathname + search);
        return NextResponse.redirect(url);
      }
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/signin";
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|api/pesapal).*)"],
};
