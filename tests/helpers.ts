import { mock } from "node:test";

export type RecordedCall = { url: string; init: RequestInit | undefined };

// Replaces global fetch. Every call is recorded; `respond` decides the reply.
export function mockFetch(
  respond: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: RecordedCall[] = [];
  mock.method(
    globalThis,
    "fetch",
    async (input: unknown, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      calls.push({ url, init });
      return respond(url, init);
    },
  );
  return calls;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Stubs next/headers cookies() so route handlers can run outside a request.
// Routes call the CJS export at request time, so stub that same object.
const nextHeaders = require("next/headers") as { cookies: () => unknown };

export function setRequestCookies(values: Record<string, string>) {
  mock.method(nextHeaders, "cookies", async () => ({
    get: (name: string) =>
      values[name] !== undefined ? { name, value: values[name] } : undefined,
  }));
}

export function headerValue(init: RequestInit | undefined, name: string) {
  const headers = new Headers(init?.headers);
  return headers.get(name);
}
