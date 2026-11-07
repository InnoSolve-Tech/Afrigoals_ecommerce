import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { POST } from "../app/api/cart/stock/route";
import { buildStockMap, findVariantStock } from "../lib/cart/stock";
import { getCartItemKey, type CartItem } from "../lib/store/cart-store";
import type { CatalogProduct } from "../lib/catalog/types";
import { mockFetch, json } from "./helpers";

afterEach(() => mock.restoreAll());
const item: CartItem = {
  productId: "p1",
  name: "Uganda Cranes",
  price: 90000,
  quantity: 1,
  selectedSize: "M",
};
const product: CatalogProduct = {
  _id: "p1",
  name: item.name,
  slug: "uganda",
  currency: "UGX",
  price: 90000,
  stock: 30,
  images: [],
  variants: [
    { _key: "small", size: "S", stock: 10 },
    { _key: "medium", size: "M", stock: 20 },
  ],
};

test("size M remains available when the live inventory contains 20", () => {
  const stock = buildStockMap([product], [item]).get(getCartItemKey(item));
  assert.equal(stock?.currentStock, 20);
  assert.equal(stock?.isOutOfStock, false);
  assert.equal(stock?.exceedsStock, false);
});
test("a key-only selection resolves its exact variant instead of the first row", () => {
  assert.equal(
    findVariantStock(product, {
      ...item,
      selectedSize: null,
      variantKey: "medium",
    }),
    20,
  );
  assert.equal(
    findVariantStock(product, {
      ...item,
      selectedSize: null,
      variantKey: "missing",
    }),
    0,
  );
});
test("old generated keys can match the selected size after catalog changes", () => {
  assert.equal(
    findVariantStock(product, {
      ...item,
      variantKey: "old-key",
      selectedSize: " m ",
    }),
    20,
  );
});
test("real zero stock and insufficient quantities still block checkout", () => {
  const empty = { ...product, variants: [{ size: "M", stock: 0 }] };
  assert.equal(
    buildStockMap([empty], [item]).get(getCartItemKey(item))?.isOutOfStock,
    true,
  );
  const many = { ...item, quantity: 21 };
  assert.equal(
    buildStockMap([product], [many]).get(getCartItemKey(many))?.exceedsStock,
    true,
  );
});
test("inventory outages are errors, never a successful empty stock list", async () => {
  mockFetch(() => json({ error: "Inventory unavailable" }, 503));
  const response = await POST(
    new Request("http://localhost/api/cart/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["p1"] }),
    }),
  );
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: "Failed to load cart stock",
  });
});
test("stock route preserves live variant quantities", async () => {
  mockFetch(() => json([{ ...product, id: "p1" }]));
  const response = await POST(
    new Request("http://localhost/api/cart/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["p1"] }),
    }),
  );
  assert.equal(response.status, 200);
  const products = await response.json();
  assert.equal(findVariantStock(products[0], item), 20);
});
