import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { GET as wallet } from "../app/api/admin/iotec/wallet/route";
import { PUT as campaign } from "../app/api/admin/email-campaigns/route";
import { PUT as partner } from "../app/api/admin/partner-stores/route";
import { POST as chat } from "../app/api/chat/route";
import { mockFetch, json, setRequestCookies } from "./helpers";
import { AUTH_COOKIE_NAME } from "../lib/auth/constants";
afterEach(() => mock.restoreAll());
test("wallet and campaign proxies reject guests before reaching the backend", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => json({}));
  assert.equal((await wallet()).status, 401);
  assert.equal(
    (
      await campaign(
        new Request("http://localhost/api/admin/email-campaigns", {
          method: "PUT",
          body: "{}",
        }),
      )
    ).status,
    401,
  );
  assert.equal(calls.length, 0);
});
test("partner store changes are forwarded using the admin session", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "admin-token" });
  const calls = mockFetch(() => json({ name: "Vargo Sports" }));
  assert.equal(
    (
      await partner(
        new Request("http://localhost/api/admin/partner-stores", {
          method: "PUT",
          body: JSON.stringify({
            name: "Vargo Sports",
            keywords: "Manchester United, Arsenal",
          }),
        }),
      )
    ).status,
    200,
  );
  assert.ok(calls[0].url.endsWith("/admin/partner-stores"));
});
test("shopping chat forwards only text history and the current session to the scout-backed API", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "owner-token" });
  const calls = mockFetch(() =>
    json({
      answer: "Contact the admin-listed partner store to confirm availability.",
    }),
  );
  const response = await chat(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        userId: "forged-account",
        messages: [
          {
            id: "1",
            role: "user",
            parts: [
              { type: "text", text: "Where can I find Arsenal jerseys?" },
            ],
          },
        ],
      }),
    }),
  );
  const stream = await response.text();
  assert.ok(stream.includes("admin-listed"));
  assert.ok(calls[0].url.endsWith("/assistant/chat"));
  assert.equal(
    JSON.stringify(JSON.parse(String(calls[0].init?.body))).includes(
      "forged-account",
    ),
    false,
  );
});
