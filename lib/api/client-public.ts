export function getPublicApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(
    /\/+$/,
    "",
  );
}

export async function apiGetPublic<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const baseUrl = getPublicApiBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
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
