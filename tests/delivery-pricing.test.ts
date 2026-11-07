import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { getDeliveryQuote } from "../lib/actions/delivery";
import { createCashOnDeliveryOrder } from "../lib/actions/create-cash-on-delivery-order";
import { AUTH_COOKIE_NAME } from "../lib/auth/constants";
import { GET, PUT } from "../app/api/admin/delivery-pricing/route";
import { mockFetch, json, setRequestCookies } from "./helpers";

process.env.AFRIGOALS_API_URL = "https://api.afrigoals-store.com";
afterEach(() => mock.restoreAll());

test("checkout displays the API delivery fee rather than local pricing settings", async () => {
  const calls = mockFetch(() =>
    json({ fee: 300, distanceKm: 0, distanceMeters: 0, currency: "UGX" }),
  );
  const quote = await getDeliveryQuote({ lat: 0.3, lng: 32.5 });
  assert.equal(quote.fee, 300);
  assert.equal(quote.success, true);
  assert.equal(
    calls[0].url,
    "https://api.afrigoals-store.com/api/v1/delivery/quote",
  );
});
test("changed admin rates are reflected by the next checkout quote", async () => {
  let fee = 300;
  mockFetch(() => json({ fee, distanceKm: 4, currency: "UGX" }));
  assert.equal((await getDeliveryQuote({ lat: 0.3, lng: 32.5 })).fee, 300);
  fee = 5500;
  assert.equal((await getDeliveryQuote({ lat: 0.3, lng: 32.5 })).fee, 5500);
});
test("a total conflict never sends an IOTEC collection request", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "customer-token" });
  const calls = mockFetch(() => json({ error: "Your total has changed" }, 409));
  const result = await createCashOnDeliveryOrder(
    [{ productId: "p1", name: "Kit", price: 500, quantity: 1 }],
    {
      address: "Kampala",
      lat: 0.3,
      lng: 32.5,
      fee: 300,
      distanceKm: 0,
      contactName: "Customer",
      contactPhone: "+256771234567",
    },
    "mobile_money",
    "+256771234567",
    800,
  );
  assert.equal(result.success, false);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(String(calls[0].init?.body)).expectedTotal, 800);
});
test("admin pricing proxy rejects guests without calling the API", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => json({}));
  assert.equal((await GET()).status, 401);
  assert.equal(
    (
      await PUT(
        new Request("http://localhost/api/admin/delivery-pricing", {
          method: "PUT",
          body: "{}",
        }),
      )
    ).status,
    401,
  );
  assert.equal(calls.length, 0);
});

test("missing upstream delivery route returns valid JSON with an actionable error", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "admin-token" });
  const calls = mockFetch(
    () =>
      new Response("Cannot GET /api/v1/admin/delivery-pricing", {
        status: 404,
      }),
  );
  const response = await GET();
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.code, "delivery_pricing_route_missing");
  assert.match(body.error, /deployment/);
  assert.equal(
    calls[0].url,
    "https://api.afrigoals-store.com/api/v1/admin/delivery-pricing",
  );
});

test("delivery save handles a non-JSON backend error without losing its status", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "admin-token" });
  mockFetch(() => new Response("Bad Gateway", { status: 502 }));
  const response = await PUT(
    new Request("http://localhost/api/admin/delivery-pricing", {
      method: "PUT",
      body: "{}",
    }),
  );
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, "invalid_upstream_response");
});

test("malformed success and unreachable API do not create fake delivery settings", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "admin-token" });
  mockFetch(() => new Response("<html>Wrong service</html>", { status: 200 }));
  assert.equal((await GET()).status, 502);
  mockFetch(() => {
    throw new Error("unreachable");
  });
  assert.equal((await GET()).status, 502);
});

test("delivery page rejects text responses and incomplete settings safely", async () => {
  const { readDeliveryPricing } = await import(
    "../lib/api/read-delivery-pricing"
  );
  await assert.rejects(
    readDeliveryPricing(new Response("Cannot GET", { status: 404 })),
    /deployment/,
  );
  await assert.rejects(
    readDeliveryPricing(json({})),
    /incomplete delivery settings/,
  );
  const settings = {
    mode: "flat",
    flatFee: 300,
    serviceFeeRate: 0.15,
    pricing: { baseFee: 300 },
  };
  assert.deepEqual(await readDeliveryPricing(json(settings)), settings);
});

test("checkout retains the API diagnostic code for failed production routing", async () => {
  mockFetch(() =>
    json(
      {
        error: "Could not calculate delivery for this location",
        code: "maps_routes_api_disabled",
      },
      503,
    ),
  );
  const result = await getDeliveryQuote({ lat: 0.333, lng: 32.568 });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "maps_routes_api_disabled");
});

test("checkout handles missing quote routes without a JSON parsing crash", async () => {
  mockFetch(
    () => new Response("Cannot POST /api/v1/delivery/quote", { status: 404 }),
  );
  const result = await getDeliveryQuote({ lat: 0.333, lng: 32.568 });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "invalid_delivery_response");
  assert.doesNotMatch(result.error ?? "", /Unexpected token/);
});
