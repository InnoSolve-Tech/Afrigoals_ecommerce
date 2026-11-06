import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { POST as postMobileMoney } from "../app/api/orders/[id]/payments/mobile-money/route";
import { GET as getMyOrders, POST as postOrder } from "../app/api/orders/route";
import { createCheckoutSession } from "../lib/actions/checkout";
import { authedFetch, authedFetchWithToken } from "../lib/api/proxy";
import { headerValue, mockFetch, setRequestCookies } from "./helpers";

const ORIGIN = "https://api.afrigoals-store.com";
const BASE = `${ORIGIN}/api/v1`;

process.env.AFRIGOALS_API_URL = ORIGIN;

afterEach(() => mock.restoreAll());

test("authedFetchWithToken without a token returns 401 and never calls the backend", async () => {
  const calls = mockFetch(() => new Response("{}", { status: 200 }));

  const res = await authedFetchWithToken(null, "/orders/my");

  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "not authenticated" });
  assert.equal(calls.length, 0);
});

test("authedFetchWithToken with a token sends a bearer header to the prefixed URL", async () => {
  const calls = mockFetch(() => new Response("[]", { status: 200 }));

  await authedFetchWithToken("tok-123", "/orders/my");

  assert.equal(calls[0].url, `${BASE}/orders/my`);
  assert.equal(headerValue(calls[0].init, "Authorization"), "Bearer tok-123");
});

test("authedFetch reads the session cookie and returns 401 for a guest", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => new Response("[]", { status: 200 }));

  const res = await authedFetch("/orders/my");

  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test("GET /api/orders for a guest is rejected before reaching the backend", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => new Response("[]", { status: 200 }));

  const res = await getMyOrders();

  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test("POST /api/orders (order creation) for a guest is rejected", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => new Response("{}", { status: 201 }));

  const res = await postOrder(
    new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    }),
  );

  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test("POST mobile-money payment for a guest is rejected", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => new Response("{}", { status: 201 }));

  const res = await postMobileMoney(
    new Request("http://localhost/api/orders/o1/payments/mobile-money", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "o1" }) },
  );

  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});

test("signed-in customer order request is forwarded with the session token", async () => {
  setRequestCookies({ afrigoals_token: "customer-token" });
  const calls = mockFetch(() => new Response("[]", { status: 200 }));

  const res = await getMyOrders();

  assert.equal(res.status, 200);
  assert.equal(calls[0].url, `${BASE}/orders/my`);
  assert.equal(
    headerValue(calls[0].init, "Authorization"),
    "Bearer customer-token",
  );
});

test("checkout submission requires sign-in and does not call the backend as a guest", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => new Response("{}", { status: 200 }));

  const result = await createCheckoutSession(
    [{ productId: "p1", name: "Kit", price: 1000, quantity: 1 }],
    {
      address: "Kampala",
      lat: 0.3,
      lng: 32.5,
      contactName: "Guest",
      contactPhone: "+256700000000",
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.url, "/signin?next=/checkout");
  assert.equal(calls.length, 0);
});
