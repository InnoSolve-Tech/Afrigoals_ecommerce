import { getBackendApiBaseUrl } from "@/lib/api/backend";
import { NextResponse } from "next/server";

const API_BASE_URL = getBackendApiBaseUrl();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const challengeId = String(body?.challengeId || "").trim();
    const code = String(body?.code || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!challengeId || !code || !newPassword) {
      return NextResponse.json(
        { error: "challengeId, code, and newPassword are required" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(
      `${API_BASE_URL}/auth/reset-password/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ challengeId, code, newPassword }),
      },
    );

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data?.error || "Failed to reset password" },
        { status: backendRes.status },
      );
    }

    return NextResponse.json({
      success: Boolean(data?.success ?? true),
      message: data?.message || "password reset successful",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
