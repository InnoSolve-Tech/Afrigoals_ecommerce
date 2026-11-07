import { NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/api/backend";
import { RIDER_COOKIE } from "@/lib/api/rider-proxy";
export async function POST(request: Request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const response = await fetch(`${getBackendApiBaseUrl()}/riders/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, password: input.password }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    return NextResponse.json(
      { error: data.error },
      { status: response.status },
    );
  if (!data.token)
    return NextResponse.json(
      { error: "Rider session was not returned" },
      { status: 502 },
    );
  const result = NextResponse.json({ rider: data.rider });
  result.cookies.set(RIDER_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
  return result;
}
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(RIDER_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
