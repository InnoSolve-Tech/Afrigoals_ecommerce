// Single source of truth for building URLs to the Go backend.
//
// The backend mounts every route under /api/v1. Env vars may be configured
// either as the origin ("https://api.afrigoals-store.com") or with the prefix
// already present ("https://api.afrigoals-store.com/api/v1"). Both forms are
// accepted here so that a missing prefix cannot silently turn into a backend
// 404 (e.g. POST /api/auth/login -> https://api.afrigoals-store.com/auth/login),
// and so that paths passed in never double the prefix.
//
// This module must not import "server-only" or next/headers: it is used by
// both server code and tests.

export const BACKEND_API_PREFIX = "/api/v1";
const DEFAULT_BACKEND_ORIGIN = "http://localhost:8080";

type EnvLike = Partial<Record<string, string | undefined>>;

export function getBackendApiBaseUrl(env: EnvLike = process.env): string {
  const raw = (
    env.AFRIGOALS_API_URL ||
    env.NEXT_PUBLIC_API_URL ||
    `${DEFAULT_BACKEND_ORIGIN}${BACKEND_API_PREFIX}`
  )
    .trim()
    .replace(/\/+$/, "");

  if (raw.endsWith(BACKEND_API_PREFIX)) {
    return raw;
  }

  return `${raw}${BACKEND_API_PREFIX}`;
}

// Joins a path relative to the API prefix, e.g. "/products/1/accessories".
// A leading "/api/v1" on the input is removed so it cannot be duplicated.
export function buildBackendApiUrl(path: string, env: EnvLike = process.env) {
  let relative = path.startsWith("/") ? path : `/${path}`;

  if (
    relative === BACKEND_API_PREFIX ||
    relative.startsWith(`${BACKEND_API_PREFIX}/`)
  ) {
    relative = relative.slice(BACKEND_API_PREFIX.length);
  }

  return `${getBackendApiBaseUrl(env)}${relative}`;
}
