import assert from "node:assert/strict";
import { test } from "node:test";
import { createCartStore } from "../lib/store/cart-store";

// Guests add items to a client-side cart. Nothing in these operations requires
// a session, and the cart keeps its contents until checkout clears it.

const kit = {
  productId: "p-kit",
  slug: "uganda-cranes-kit",
  name: "Uganda Cranes Kit",
  price: 85000,
  image: "/kit.png",
};

test("guest can add a product and it is kept in the cart", () => {
  const store = createCartStore();

  store.getState().addItem(kit);

  assert.equal(store.getState().items.length, 1);
  assert.equal(store.getState().items[0].quantity, 1);
  assert.equal(store.getState().items[0].productId, "p-kit");
});

test("adding the same product again increments its quantity instead of duplicating it", () => {
  const store = createCartStore();

  store.getState().addItem(kit);
  store.getState().addItem(kit, 2);

  assert.equal(store.getState().items.length, 1);
  assert.equal(store.getState().items[0].quantity, 3);
});

test("different sizes of the same product are separate cart lines", () => {
  const store = createCartStore();

  store.getState().addItem({ ...kit, selectedSize: "M" });
  store.getState().addItem({ ...kit, selectedSize: "L" });

  assert.equal(store.getState().items.length, 2);
});

test("quantity updates and removals operate on the selected line only", () => {
  const store = createCartStore();

  store.getState().addItem({ ...kit, selectedSize: "M" });
  store.getState().addItem({ ...kit, selectedSize: "L" });
  store.getState().updateQuantity("p-kit", 4, null, "M", null);
  store.getState().removeItem("p-kit", null, "L", null);

  const items = store.getState().items;
  assert.equal(items.length, 1);
  assert.equal(items[0].selectedSize, "M");
  assert.equal(items[0].quantity, 4);
});

test("selected accessories are stored with the cart line", () => {
  const store = createCartStore();

  store.getState().addItem({
    ...kit,
    accessories: [
      { accessoryId: "a-1", quantity: 1, text: "", number: "", notes: "" },
    ],
  });
  store.getState().updateQuantity("p-kit", 2);

  assert.equal(store.getState().items[0].accessories?.[0].accessoryId, "a-1");
  assert.equal(store.getState().items[0].quantity, 2);
});

test("cart contents survive until clearCart is called, and clearCart empties them", () => {
  const store = createCartStore();

  store.getState().addItem(kit);
  store.getState().closeCart();
  assert.equal(store.getState().items.length, 1);

  store.getState().clearCart();
  assert.equal(store.getState().items.length, 0);
});
