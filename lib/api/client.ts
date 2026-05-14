import "server-only";

export function getApiBaseUrl() {
  return (
    process.env.AFRIGOALS_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const shouldUseDefaultRevalidation = !init?.cache && !init?.next;
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    ...(shouldUseDefaultRevalidation
      ? {
          next: {
            revalidate: 300,
          },
        }
      : {}),
  });

  if (!res.ok) {
    throw new Error(`API GET ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
