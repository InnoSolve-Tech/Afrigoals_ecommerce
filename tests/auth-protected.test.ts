import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { POST as postMobileMoney } from "../app/api/orders/[id]/payments/mobile-money/route";
import { GET as getMyOrders, POST as postOrder } from "../app/api/orders/route";
import { AUTH_COOKIE_NAME } from "../lib/auth/constants";
import { createCashOnDeliveryOrder } from "../lib/actions/create-cash-on-delivery-order";
import { createCheckoutSession } from "../lib/actions/checkout";
import { authedFetch, authedFetchWithToken } from "../lib/api/proxy";
import { headerValue, json, mockFetch, setRequestCookies } from "./helpers";

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
  setRequestCookies({ [AUTH_COOKIE_NAME]: "customer-token" });
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

test("online checkout creates an IOTEC order and starts collection without a gateway redirect", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "customer-token" });
  const calls = mockFetch((url) => {
    if (url === `${BASE}/orders`)
      return new Response(JSON.stringify({ id: "o1", orderNumber: "AFG-1" }), {
        status: 201,
      });
    if (url === `${BASE}/orders/o1/payments/mobile-money`)
      return new Response(JSON.stringify({ status: "processing" }), {
        status: 202,
      });
    throw new Error(`Unexpected checkout URL: ${url}`);
  });
  const result = await createCheckoutSession(
    [{ productId: "p1", name: "Kit", price: 1000, quantity: 1 }],
    {
      address: "Kampala",
      lat: 0.3,
      lng: 32.5,
      contactName: "Customer",
      contactPhone: "+256771234567",
    },
  );
  assert.equal(result.success, true);
  assert.equal(result.url, "/orders/o1/pay");
  assert.equal(calls.length, 2);
  assert.equal(
    JSON.parse(String(calls[0].init?.body)).paymentMethod,
    "mobile_money",
  );
  assert.equal(JSON.parse(String(calls[1].init?.body)).phone, "+256771234567");
});

test("cash on delivery creates an order without starting an IOTEC collection", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "customer-token" });
  const calls = mockFetch(
    () => new Response(JSON.stringify({ id: "cod-1" }), { status: 201 }),
  );
  const result = await createCashOnDeliveryOrder(
    [{ productId: "p1", name: "Kit", price: 1000, quantity: 1 }],
    {
      address: "Kampala",
      lat: 0.3,
      lng: 32.5,
      fee: 0,
      distanceKm: 0,
      contactName: "Customer",
      contactPhone: "+256771234567",
    },
    "cod",
  );
  assert.equal(result.success, true);
  assert.equal(result.url, "/orders/cod-1?payment=cod");
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(String(calls[0].init?.body)).paymentMethod, "cod");
});

test("failed order creation never starts an IOTEC collection", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "customer-token" });
  const calls = mockFetch(
    () =>
      new Response(JSON.stringify({ error: "Delivery quote unavailable" }), {
        status: 503,
      }),
  );
  const result = await createCheckoutSession(
    [{ productId: "p1", name: "Kit", price: 1000, quantity: 1 }],
    {
      address: "Kampala",
      lat: 0.3,
      lng: 32.5,
      contactName: "Customer",
      contactPhone: "+256771234567",
    },
  );
  assert.equal(result.success, false);
  assert.equal(result.error, "Delivery quote unavailable");
  assert.equal(calls.length, 1);
});

test("guest refund requests cannot reach the backend", async () => {
  setRequestCookies({});
  const route = await import("../app/api/orders/[id]/refund-requests/route");
  const calls = mockFetch(() => json({}));
  const request = new Request(
    "http://localhost/api/orders/o1/refund-requests",
    { method: "POST", body: JSON.stringify({ amount: 800 }) },
  );
  const response = await route.POST(request, {
    params: Promise.resolve({ id: "o1" }),
  });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});
