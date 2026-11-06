import { getBackendApiBaseUrl } from "@/lib/api/backend";
import { NextResponse } from "next/server";

const API_BASE_URL = getBackendApiBaseUrl();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const backendRes = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ email }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data?.error || "Failed to send reset code" },
        { status: backendRes.status },
      );
    }

    return NextResponse.json({
      success: Boolean(data?.success ?? true),
      challengeId: data?.challengeId,
      maskedEmail: data?.maskedEmail,
      message:
        data?.message || "if the email exists, a reset code has been sent",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send reset code" },
      { status: 500 },
    );
  }
}
