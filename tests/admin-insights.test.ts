import "./setup-server-only";
import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { GET } from "../app/api/admin/insights/route";
import { json, mockFetch, setRequestCookies } from "./helpers";
import { AUTH_COOKIE_NAME } from "../lib/auth/constants";
afterEach(() => mock.restoreAll());
test("dashboard counts only collected non-cancelled payments as revenue", async () => {
  setRequestCookies({ [AUTH_COOKIE_NAME]: "admin-token" });
  mockFetch(() =>
    json([
      {
        id: "paid",
        status: "confirmed",
        paymentStatus: "paid",
        paymentMethod: "mobile_money",
        currency: "UGX",
        subtotal: 500,
        deliveryFee: 300,
        total: 800,
        items: [
          {
            productId: "p1",
            productName: "Kit",
            quantity: 1,
            lineSubtotal: 500,
          },
        ],
      },
      {
        id: "pending",
        status: "confirmed",
        paymentStatus: "unpaid",
        paymentMethod: "cod",
        subtotal: 500,
        deliveryFee: 300,
        total: 800,
        items: [],
      },
      {
        id: "cancelled",
        status: "cancelled",
        paymentStatus: "paid",
        subtotal: 500,
        deliveryFee: 300,
        total: 800,
        items: [],
      },
    ]),
  );
  const response = await GET();
  const report = await response.json();
  assert.equal(report.totals.revenue, 800);
  assert.equal(report.totals.paidOrders, 1);
  assert.equal(report.totals.outstandingCod, 800);
  assert.equal(
    report.totals.productRevenue + report.totals.deliveryFees,
    report.totals.revenue,
  );
  assert.equal(report.topProducts[0].units, 1);
});
