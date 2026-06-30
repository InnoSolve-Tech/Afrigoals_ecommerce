// app/api/auth/login/route.ts
import { NextResponse } from "next/server";

const apiBaseUrl = (
  process.env.AFRIGOALS_API_URL ||
  "http://localhost:8080/api/v1"
).replace(/\/+$/, "");

export async function POST(req: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: (data as any)?.error || "Failed to sign in" },
      { status: res.status },
    );
  }

  return NextResponse.json({
    requires2fa: Boolean((data as any)?.requires2fa),
    challengeId: (data as any)?.challengeId,
    maskedEmail: (data as any)?.maskedEmail,
    message: (data as any)?.message || "verification code sent",
  });
}