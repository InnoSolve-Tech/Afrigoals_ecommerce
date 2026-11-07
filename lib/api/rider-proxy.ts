import "server-only";
import { cookies } from "next/headers";
import { getBackendApiBaseUrl } from "@/lib/api/backend";
export const RIDER_COOKIE = "afrigoals_rider_token";
export async function riderFetch(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(RIDER_COOKIE)?.value;
  if (!token)
    return new Response(JSON.stringify({ error: "Rider sign-in required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  return fetch(`${getBackendApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}
