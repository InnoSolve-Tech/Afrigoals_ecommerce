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

test("trusted admin login forwards its device token and establishes a session", async () => {
  setRequestCookies({ afrigoals_trusted_device: "trusted-browser" });
  const { TRUSTED_DEVICE_COOKIE_NAME } = await import("../lib/auth/constants");
  setRequestCookies({ [TRUSTED_DEVICE_COOKIE_NAME]: "trusted-browser" });
  const { POST } = await import("../app/api/auth/login/route");
  const calls = mockFetch(() =>
    json({ token: "admin-session", user: { id: "a1", role: "admin" } }),
  );
  const res = await POST(
    jsonRequest({ email: "admin@example.com", password: "secret" }),
  );
  assert.equal(
    headerValue(calls[0].init, "X-Trusted-Device"),
    "trusted-browser",
  );
  assert.match(
    res.headers.get("set-cookie") ?? "",
    /afrigoals_token=admin-session/,
  );
  assert.equal(res.status, 200);
});

test("admin sign-in verifies the established session before proceeding", async () => {
  const { verifyAdminSession } = await import("../lib/auth/admin-signin");
  const calls = mockFetch(() => json({ id: "a1", role: "admin" }));
  assert.equal(await verifyAdminSession(), null);
  assert.equal(calls[0].url, "/api/auth/me");
  assert.equal(calls.length, 1);
});

test("admin sign-in rejects customer sessions and clears their login", async () => {
  const { verifyAdminSession } = await import("../lib/auth/admin-signin");
  const calls = mockFetch(() => json({ id: "u1", role: "user" }));
  assert.equal(await verifyAdminSession(), "This account is not an admin.");
  assert.equal(calls[1].url, "/api/auth/logout");
  assert.equal(calls[1].init?.method, "POST");
});

test("malformed login success does not pretend a verification code was sent", async () => {
  setRequestCookies({});
  const { POST } = await import("../app/api/auth/login/route");
  mockFetch(() => json({}));
  const res = await POST(
    jsonRequest({ email: "admin@example.com", password: "secret" }),
  );
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("set-cookie"), null);
});

test("logout expires the active session cookie and forbids response caching", async () => {
  const { POST } = await import("../app/api/auth/logout/route");
  const res = await POST();
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie") ?? "", /afrigoals_token=;/);
  assert.match(res.headers.get("set-cookie") ?? "", /Max-Age=0/i);
  assert.match(res.headers.get("cache-control") ?? "", /no-store/);
});

test("a remembered device without an active session cannot open admin pages", async () => {
  const { NextRequest } = await import("next/server");
  const { default: middleware } = await import("../middleware");
  const calls = mockFetch(() => json({ role: "admin" }));
  const res = await middleware(
    new NextRequest("http://localhost/admin/delivery-pricing", {
      headers: { cookie: "afrigoals_trusted_device=remembered" },
    }),
  );
  assert.equal(new URL(res.headers.get("location")!).pathname, "/admin/signin");
  assert.equal(calls.length, 0);
});

test("an expired admin session is redirected to sign-in", async () => {
  const { NextRequest } = await import("next/server");
  const { default: middleware } = await import("../middleware");
  mockFetch(() => json({ error: "not authenticated" }, 401));
  const res = await middleware(
    new NextRequest("http://localhost/admin/delivery-pricing", {
      headers: { cookie: "afrigoals_token=expired" },
    }),
  );
  assert.equal(new URL(res.headers.get("location")!).pathname, "/admin/signin");
});

test("logout immediately broadcasts signed-out state to all subscribers and other tabs", async () => {
  const { subscribeAuthChanges, logoutSession } = await import(
    "../lib/auth/events"
  );
  const target = new EventTarget();
  const stored = new Map<string, string>([["auth_user", "cached-admin"]]);
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
      localStorage: {
        setItem: (key: string, value: string) => stored.set(key, value),
        removeItem: (key: string) => stored.delete(key),
      },
    },
  });
  const first: unknown[] = [];
  const second: unknown[] = [];
  const stopA = subscribeAuthChanges((x) => first.push(x));
  const stopB = subscribeAuthChanges((x) => second.push(x));
  try {
    mockFetch(() => json({ ok: true }));
    await logoutSession();
    assert.deepEqual(first, ["signed_out"]);
    assert.deepEqual(second, ["signed_out"]);
    assert.equal(stored.has("auth_user"), false);
    const value = stored.get("afrigoals_auth_change")!;
    assert.equal(JSON.parse(value).change, "signed_out");
    const remote = new Event("storage");
    Object.defineProperties(remote, {
      key: { value: "afrigoals_auth_change" },
      newValue: { value },
    });
    target.dispatchEvent(remote);
    assert.deepEqual(first, ["signed_out", "signed_out"]);
    assert.deepEqual(second, ["signed_out", "signed_out"]);
  } finally {
    stopA();
    stopB();
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("failed logout is reported instead of pretending the cookie was cleared", async () => {
  const { logoutSession } = await import("../lib/auth/events");
  mockFetch(() => json({ error: "temporary failure" }, 503));
  await assert.rejects(logoutSession(), /Could not sign out/);
});
