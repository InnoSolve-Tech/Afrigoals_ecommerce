// app/api/auth/login/verify/route.ts
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

const apiBaseUrl = (
  process.env.AFRIGOALS_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/+$/, "");

export async function POST(req: Request) {
  let body: { challengeId?: string; code?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const challengeId = String(body.challengeId || "").trim();
  const code = String(body.code || "").trim();

  if (!challengeId || !code) {
    return NextResponse.json(
      { error: "challengeId and code are required" },
      { status: 400 },
    );
  }

  const res = await fetch(`${apiBaseUrl}/auth/login/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ challengeId, code }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as any)?.error || "Verification failed" },
      { status: res.status },
    );
  }

  const token = (data as any)?.token;

  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    user: (data as any)?.user || null,
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}