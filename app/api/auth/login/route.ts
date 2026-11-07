import { getBackendApiBaseUrl } from "@/lib/api/backend";
// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "@/lib/auth/constants";

const apiBaseUrl = getBackendApiBaseUrl();

export async function POST(req: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const trustedDevice = (await cookies()).get(
    TRUSTED_DEVICE_COOKIE_NAME,
  )?.value;

  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(trustedDevice ? { "X-Trusted-Device": trustedDevice } : {}),
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

  if ((data as any)?.token && (data as any)?.user) {
    const response = NextResponse.json({
      token: (data as any).token,
      user: (data as any).user,
    });

    response.cookies.set(AUTH_COOKIE_NAME, (data as any).token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  }

  if (
    !(data as any)?.requires2fa ||
    typeof (data as any)?.challengeId !== "string" ||
    !(data as any).challengeId.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "The sign-in service returned an incomplete response. Please try again.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    requires2fa: Boolean((data as any)?.requires2fa),
    challengeId: (data as any)?.challengeId,
    maskedEmail: (data as any)?.maskedEmail,
    message: (data as any)?.message || "verification code sent",
  });
}
