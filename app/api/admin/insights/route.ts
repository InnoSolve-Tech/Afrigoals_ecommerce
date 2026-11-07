import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
import type { ApiOrder } from "@/lib/api/types";

function normalizeStatus(status?: string) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function isCancelled(order: ApiOrder) {
  const status = normalizeStatus(order.status);
  return status === "cancelled" || status === "canceled";
}

/**
 * An order counts as revenue once its payment is collected. Payment status is
 * the source of truth: IOTEC verification sets "paid" on success, and an admin sets it when
 * cash is collected for cash-on-delivery orders. Order status is not used,
 * because a "confirmed" COD order has not been paid yet.
 */
function isRecognisedRevenue(order: ApiOrder) {
  if (isCancelled(order)) return false;
  return normalizeStatus((order as any).paymentStatus) === "paid";
}

function lineRevenue(item: NonNullable<ApiOrder["items"]>[number]) {
  if (typeof item.lineSubtotal === "number") return item.lineSubtotal;
  return Number(item.priceAtPurchase || 0) * Number(item.quantity || 0);
}

export async function GET() {
  const res = await authedFetch("/admin/orders");
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: body?.error || "Failed to load admin orders" },
      { status: res.status },
    );
  }

  const orders = Array.isArray(body) ? (body as ApiOrder[]) : [];
  const liveOrders = orders.filter((order) => !isCancelled(order));
  const paidOrders = orders.filter(isRecognisedRevenue);

  // Revenue is split so the figures reconcile: product sales + delivery fees
  // = order totals for paid orders.
  const productRevenue = paidOrders.reduce(
    (sum, order) => sum + Number(order.subtotal || 0),
    0,
  );
  const deliveryFees = paidOrders.reduce(
    (sum, order) => sum + Number(order.deliveryFee || 0),
    0,
  );
  const revenue = paidOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  const outstandingCod = liveOrders
    .filter(
      (order) =>
        !isRecognisedRevenue(order) &&
        normalizeStatus(order.paymentMethod) === "cod",
    )
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const averageOrderValue =
    paidOrders.length > 0 ? revenue / paidOrders.length : 0;

  type ProductSales = {
    productId: string;
    name: string;
    units: number;
    orders: number;
    revenue: number;
  };

  const productSales = new Map<string, ProductSales>();

  for (const order of paidOrders) {
    const seenInOrder = new Set<string>();

    for (const item of order.items || []) {
      const productId = item.productId || "unknown";
      const current: ProductSales = productSales.get(productId) || {
        productId,
        name: item.productName || "Unknown product",
        units: 0,
        orders: 0,
        revenue: 0,
      };

      current.units += Number(item.quantity || 0);
      current.revenue += lineRevenue(item);

      if (!seenInOrder.has(productId)) {
        current.orders += 1;
        seenInOrder.add(productId);
      }

      productSales.set(productId, current);
    }
  }

  const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
    const status = normalizeStatus(order.status) || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    success: true,
    currency: orders[0]?.currency || "UGX",
    totals: {
      orders: orders.length,
      liveOrders: liveOrders.length,
      paidOrders: paidOrders.length,
      pendingOrders: liveOrders.filter((order) =>
        ["pending", "pending_payment"].includes(normalizeStatus(order.status)),
      ).length,
      deliveredOrders: liveOrders.filter(
        (order) => normalizeStatus(order.status) === "delivered",
      ).length,
      cancelledOrders: orders.length - liveOrders.length,
      revenue,
      productRevenue,
      deliveryFees,
      outstandingCod,
      averageOrderValue,
    },
    byStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    })),
    topProducts: Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    recentOrders: orders.slice(0, 5),
  });
}
