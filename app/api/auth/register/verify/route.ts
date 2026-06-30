import { NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.AFRIGOALS_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

const AUTH_COOKIE_NAME = "afrigoals_token";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const challengeId = String(body?.challengeId || "").trim();
    const code = String(body?.code || "").trim();

    if (!challengeId || !code) {
      return NextResponse.json(
        { error: "challengeId and code are required" },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${API_BASE_URL}/auth/register/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        challengeId,
        code,
      }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data?.error || "Email verification failed" },
        { status: backendRes.status }
      );
    }

    if (!data?.token) {
      return NextResponse.json(
        { error: "backend did not return auth token" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      user: data.user,
      message: "account verified",
    });

    res.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: data.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Email verification failed" },
      { status: 500 }
    );
  }
}