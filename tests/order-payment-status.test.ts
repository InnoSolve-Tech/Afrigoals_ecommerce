import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatOrderPayment,
  effectiveOrderStage,
  orderIsPaid,
} from "../lib/orders/status";
test("verified online payments display Paid for legacy and new early stages", () => {
  for (const status of ["confirmed", "pending_payment", "unpaid", "paid"])
    assert.equal(
      effectiveOrderStage({ status, paymentStatus: "paid" }),
      "paid",
    );
});
test("pending payments are not shown as paid", () => {
  assert.equal(
    orderIsPaid({ status: "confirmed", paymentStatus: "pending" }),
    false,
  );
  assert.equal(
    effectiveOrderStage({
      status: "pending_payment",
      paymentStatus: "pending",
    }),
    "pending_payment",
  );
});
test("payment badge stays Paid while fulfilment advances", () => {
  for (const status of ["processing", "shipped", "delivered", "cancelled"]) {
    const order = { status, paymentStatus: "paid" };
    assert.equal(effectiveOrderStage(order), status);
    assert.equal(orderIsPaid(order), true);
  }
});

test("refund results remain separate from original verified payment", () => {
  const order = { status: "cancelled", paymentStatus: "paid", total: 2000 };
  assert.equal(
    formatOrderPayment({ ...order, refundedAmount: 2000 }),
    "Refunded",
  );
  assert.equal(
    formatOrderPayment({ ...order, refundedAmount: 800 }),
    "Partially refunded",
  );
  assert.equal(
    formatOrderPayment({ ...order, refundPendingAmount: 800 }),
    "Paid · refund pending",
  );
  assert.equal(formatOrderPayment(order), "Paid");
});

test("customer refund status distinguishes review, approval and verified payment", async () => {
  const { refundRequestLabel } = await import("../lib/orders/refund-requests");
  assert.equal(
    refundRequestLabel({ status: "requested", refundStatus: "" }),
    "Awaiting admin review",
  );
  assert.equal(
    refundRequestLabel({ status: "declined", refundStatus: "" }),
    "Request declined",
  );
  assert.equal(
    refundRequestLabel({ status: "approved", refundStatus: "draft" }),
    "Approved · awaiting refund submission",
  );
  assert.equal(
    refundRequestLabel({ status: "approved", refundStatus: "processing" }),
    "Approved · awaiting refund confirmation",
  );
  assert.equal(
    refundRequestLabel({ status: "approved", refundStatus: "succeeded" }),
    "Refund paid",
  );
  assert.equal(
    refundRequestLabel({ status: "approved", refundStatus: "failed" }),
    "Approved · payment needs attention",
  );
});
