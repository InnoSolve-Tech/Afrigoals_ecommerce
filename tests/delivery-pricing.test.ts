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
