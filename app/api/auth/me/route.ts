import { getBackendApiBaseUrl } from "@/lib/api/backend";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

const apiBaseUrl = getBackendApiBaseUrl();

export async function GET(req: Request) {
  void req;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;

  if (!token) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const res = await fetch(`${apiBaseUrl}/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const data = await res.json().catch(() => null);
  return NextResponse.json(data);
}
