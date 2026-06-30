import { NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.AFRIGOALS_API_URL || "http://localhost:8080/api/v1"
).replace(/\/$/, "");

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data?.error || "Failed to create account" },
        { status: backendRes.status }
      );
    }

    if (!data?.requiresEmailVerification || !data?.challengeId) {
      return NextResponse.json(
        { error: "Invalid register response from backend" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        requiresEmailVerification: true,
        challengeId: data.challengeId,
        maskedEmail: data.maskedEmail,
        message: data.message || "verification code sent",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}