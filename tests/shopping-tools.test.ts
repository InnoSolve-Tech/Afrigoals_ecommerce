import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { getMyOrders } from "../lib/ai/tools/get-my-orders";
import { searchProducts } from "../lib/ai/tools/search-products";
import { AUTH_COOKIE_NAME } from "../lib/auth/constants";
import { mockFetch, json, setRequestCookies } from "./helpers";
process.env.AFRIGOALS_API_URL = "https://api.afrigoals-store.com";
afterEach(() => mock.restoreAll());
test("shopping order tool does not fetch orders for a guest", async () => {
  setRequestCookies({});
  const calls = mockFetch(() => json([]));
  const result = await getMyOrders();
  assert.equal(result.isAuthenticated, false);
  assert.equal(calls.length, 0);
});
test("shopping order tool uses the customer's session and strips delivery details", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "owner-token" });
  const calls = mockFetch(() =>
    json([
      {
        id: "own",
        orderNumber: "ORD1",
        total: 800,
        status: "pending_payment",
        createdAt: "2026-11-07",
        deliveryAddress: "private address",
        email: "private@email",
        items: [],
      },
    ]),
  );
  const result = await getMyOrders();
  assert.equal(
    calls[0].url,
    "https://api.afrigoals-store.com/api/v1/orders/my",
  );
  assert.equal(result.orders[0].id, "own");
  assert.equal(JSON.stringify(result).includes("private address"), false);
});
test("shopping product tool uses the correct API prefix and selected size stock", async () => {
  const calls = mockFetch(() =>
    json([
      {
        id: "p1",
        slug: "kit",
        name: "Kit",
        price: 500,
        stock: 40,
        images: [],
        variants: [
          { size: "M", stock: 20 },
          { size: "S", stock: 20 },
        ],
      },
    ]),
  );
  const result = await searchProducts({ size: "M", maxPrice: 800 });
  assert.equal(result.products[0].stockCount, 20);
  assert.ok(calls[0].url.includes("/api/v1/products"));
});
