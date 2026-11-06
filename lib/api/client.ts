import "server-only";

import { buildBackendApiUrl } from "@/lib/api/backend";

// Unauthenticated server-side GET used by the storefront catalog.
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildBackendApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API GET ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
