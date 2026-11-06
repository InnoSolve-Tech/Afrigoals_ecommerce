import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { GET as getAccessories } from "../app/api/products/[id]/accessories/route";
import { apiGet } from "../lib/api/client";
import { apiGetPublic } from "../lib/api/client-public";
import { headerValue, json, mockFetch } from "./helpers";

const ORIGIN = "https://api.afrigoals-store.com";
const BASE = `${ORIGIN}/api/v1`;
const PRODUCT_ID = "5f8f5f6b-e497-4f1c-9cd5-81fb1a00bad8";

const savedEnv = { ...process.env };

beforeEach(() => {
  process.env.AFRIGOALS_API_URL = ORIGIN;
  delete process.env.NEXT_PUBLIC_API_URL;
});

afterEach(() => {
  mock.restoreAll();
  process.env = { ...savedEnv };
});

function accessoriesCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Guest requests: no cookie is set and the handler does not read one.
// cookies() throws outside a Next request scope, so these tests also prove
// the public route does not depend on the session.
test("guest accessory request returns 200 with backend data and no auth header", async () => {
  const payload = [
    { id: "link-1", isRequired: false, accessory: { id: "a1" } },
  ];
  const calls = mockFetch(() => json(payload));

  const res = await getAccessories(
    new Request("http://localhost/api/products/x/accessories"),
    accessoriesCtx(PRODUCT_ID),
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), payload);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${BASE}/products/${PRODUCT_ID}/accessories`);
  assert.equal(headerValue(calls[0].init, "Authorization"), null);
});

test("guest accessory request for an unknown product forwards the backend 404", async () => {
  mockFetch(() => json({ error: "product not found" }, 404));

  const res = await getAccessories(
    new Request("http://localhost/api/products/missing/accessories"),
    accessoriesCtx("missing"),
  );

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "product not found" });
});

test("accessory request reports 502 when the backend is unreachable", async () => {
  mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });

  const res = await getAccessories(
    new Request("http://localhost/api/products/x/accessories"),
    accessoriesCtx(PRODUCT_ID),
  );

  assert.equal(res.status, 502);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("accessory request rejects a blank product id without calling the backend", async () => {
  const calls = mockFetch(() => json([]));

  const res = await getAccessories(
    new Request("http://localhost/api/products/%20/accessories"),
    accessoriesCtx("   "),
  );

  assert.equal(res.status, 400);
  assert.equal(calls.length, 0);
});

test("guest product listing uses the prefixed public base and sends no credentials", async () => {
  const calls = mockFetch(() => json([{ id: PRODUCT_ID, name: "Kit" }]));

  const products = await apiGet<{ id: string }[]>("/products");

  assert.equal(products[0].id, PRODUCT_ID);
  assert.equal(calls[0].url, `${BASE}/products`);
  assert.equal(headerValue(calls[0].init, "Authorization"), null);
});

test("guest product detail uses the prefixed public base", async () => {
  const calls = mockFetch(() => json({ id: PRODUCT_ID, name: "Kit" }));

  const product = await apiGet<{ name: string }>(`/products/${PRODUCT_ID}`);

  assert.equal(product.name, "Kit");
  assert.equal(calls[0].url, `${BASE}/products/${PRODUCT_ID}`);
});

test("apiGetPublic never attaches credentials and uses the prefixed base", async () => {
  const calls = mockFetch(() => json({ ok: true }));

  await apiGetPublic("/products/slug/kit");

  assert.equal(calls[0].url, `${BASE}/products/slug/kit`);
  assert.equal(headerValue(calls[0].init, "Authorization"), null);
});

test("apiGet throws on backend error so callers can show a storefront error", async () => {
  mockFetch(() => json({ error: "db error" }, 500));
  await assert.rejects(() => apiGet("/products"), /failed: 500/);
});
