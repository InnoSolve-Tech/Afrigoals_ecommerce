import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { cookies } from "next/headers";

export function getBackendBaseUrl() {
  return (
    process.env.AFRIGOALS_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080/api/v1"
  ).replace(/\/+$/, "");
}

export async function authedFetch(inputPath: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: "not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = getBackendBaseUrl();
  return fetch(`${baseUrl}${inputPath}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}
