import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { headerValue, json, mockFetch, setRequestCookies } from "./helpers";

const ORIGIN = "https://api.afrigoals-store.com";
const BASE = `${ORIGIN}/api/v1`;

// Route modules read AFRIGOALS_API_URL when they are first imported, so the
// env var is set before any route is loaded (routes are imported lazily below).
process.env.AFRIGOALS_API_URL = ORIGIN;

afterEach(() => mock.restoreAll());

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("sign-in posts to the prefixed backend route and sets the session cookie", async () => {
  setRequestCookies({});
  const { POST } = await import("../app/api/auth/login/route");
  const calls = mockFetch(() =>
    json({
      token: "session-token",
      user: { id: "u1", email: "fan@example.com", role: "user" },
    }),
  );

  const res = await POST(
    jsonRequest({ email: "Fan@Example.com", password: "secret" }),
  );

  assert.equal(calls[0].url, `${BASE}/auth/login`);
  assert.equal(res.status, 200);
  assert.match(
    res.headers.get("set-cookie") ?? "",
    /afrigoals_token=session-token/,
  );
  const body = (await res.json()) as { user: { id: string } };
  assert.equal(body.user.id, "u1");
});

test("sign-in forwards a backend rejection with its status and message", async () => {
  setRequestCookies({});
  const { POST } = await import("../app/api/auth/login/route");
  mockFetch(() => json({ error: "invalid credentials" }, 401));

  const res = await POST(jsonRequest({ email: "a@b.co", password: "bad" }));

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "invalid credentials" });
  assert.equal(res.headers.get("set-cookie"), null);
});

test("sign-in that needs a 2FA code does not set a session cookie", async () => {
  setRequestCookies({});
  const { POST } = await import("../app/api/auth/login/route");
  mockFetch(() =>
    json({ requires2fa: true, challengeId: "c1", maskedEmail: "f***@e.com" }),
  );

  const res = await POST(jsonRequest({ email: "a@b.co", password: "pw" }));
  const body = (await res.json()) as {
    requires2fa: boolean;
    challengeId: string;
  };

  assert.equal(body.requires2fa, true);
  assert.equal(body.challengeId, "c1");
  assert.equal(res.headers.get("set-cookie"), null);
});

test("verifying the 2FA code posts to the prefixed route and sets the session cookie", async () => {
  setRequestCookies({});
  const { POST } = await import("../app/api/auth/login/verify/route");
  const calls = mockFetch(() =>
    json({ token: "verified-token", user: { id: "u1", role: "user" } }),
  );

  const res = await POST(
    new Request("http://localhost/api/auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: "c1", code: "123456" }),
    }),
  );

  assert.equal(calls[0].url, `${BASE}/auth/login/verify`);
  assert.equal(res.status, 200);
  assert.match(
    res.headers.get("set-cookie") ?? "",
    /afrigoals_token=verified-token/,
  );
});

test("guest /api/auth/me returns 401 without calling the backend", async () => {
  setRequestCookies({});
  const { GET } = await import("../app/api/auth/me/route");
  const calls = mockFetch(() => json({ id: "x" }));

  const res = await GET(new Request("http://localhost/api/auth/me"));

  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test("/api/auth/me with a session returns the user using the bearer token", async () => {
  setRequestCookies({ afrigoals_token: "session-token" });
  const { GET } = await import("../app/api/auth/me/route");
  const calls = mockFetch(() =>
    json({ id: "u1", email: "fan@example.com", role: "user" }),
  );

  const res = await GET(new Request("http://localhost/api/auth/me"));

  assert.equal(calls[0].url, `${BASE}/me`);
  assert.equal(
    headerValue(calls[0].init, "Authorization"),
    "Bearer session-token",
  );
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { role: string }).role, "user");
});
