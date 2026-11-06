import { cookies } from "next/headers";
import { buildBackendApiUrl } from "@/lib/api/backend";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

function unauthenticatedResponse() {
  return new Response(JSON.stringify({ error: "not authenticated" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

// Use only for routes that genuinely need a signed-in customer or admin.
// Public catalog data must use lib/api/client.ts or lib/api/client-public.ts.
export async function authedFetch(inputPath: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return authedFetchWithToken(token, inputPath, init);
}

// Separated from authedFetch so the "no token -> 401, backend never called"
// rule can be tested without a Next.js request context.
export function authedFetchWithToken(
  token: string | null | undefined,
  inputPath: string,
  init?: RequestInit,
) {
  if (!token) {
    return Promise.resolve(unauthenticatedResponse());
  }

  return fetch(buildBackendApiUrl(inputPath), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}
