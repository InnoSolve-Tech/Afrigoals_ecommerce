import { NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.AFRIGOALS_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

const AUTH_COOKIE_NAME = "afrigoals_token";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const credential = String(body?.credential || "").trim();

    if (!credential) {
      return NextResponse.json(
        { error: "google credential is required" },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ credential }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data?.error || "Google sign in failed" },
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
      message: "Google sign in successful",
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
      { error: "Google sign in failed" },
      { status: 500 }
    );
  }
}