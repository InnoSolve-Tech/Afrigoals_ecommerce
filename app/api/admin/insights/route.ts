import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
import type { ApiOrder } from "@/lib/api/types";

function normalizeStatus(status?: string) {
  return String(status || "").trim().toLowerCase();
}

function isPaidOrder(order: ApiOrder) {
  const status = normalizeStatus(order.status);
  const paymentStatus = normalizeStatus((order as any).paymentStatus);
  return (
    paymentStatus === "paid" ||
    status === "paid" ||
    status === "confirmed" ||
    status === "packed" ||
    status === "shipped" ||
    status === "out_for_delivery" ||
    status === "delivered"
  );
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
  const paidOrders = orders.filter(isPaidOrder);
  const pendingOrders = orders.filter((order) =>
    ["pending", "pending_payment"].includes(normalizeStatus(order.status)),
  );
  const deliveredOrders = orders.filter(
    (order) => normalizeStatus(order.status) === "delivered",
  );

  const revenue = paidOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0,
  );
  const deliveryFees = orders.reduce(
    (sum, order) => sum + Number(order.deliveryFee || 0),
    0,
  );
  const averageOrderValue = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

  const productSales = new Map<
    string,
    { productId: string; name: string; units: number; revenue: number }
  >();

  for (const order of paidOrders) {
    for (const item of order.items || []) {
      const productId = item.productId || "unknown";
      const current =
        productSales.get(productId) ||
        {
          productId,
          name: item.productName || "Unknown product",
          units: 0,
          revenue: 0,
        };

      current.units += Number(item.quantity || 0);
      current.revenue += Number(
        item.lineSubtotal ?? item.total ?? item.priceAtPurchase * item.quantity,
      );
      productSales.set(productId, current);
    }
  }

  return NextResponse.json({
    success: true,
    currency: orders[0]?.currency || "UGX",
    totals: {
      orders: orders.length,
      paidOrders: paidOrders.length,
      pendingOrders: pendingOrders.length,
      deliveredOrders: deliveredOrders.length,
      revenue,
      deliveryFees,
      averageOrderValue,
    },
    byStatus: Object.entries(
      orders.reduce<Record<string, number>>((acc, order) => {
        const status = normalizeStatus(order.status) || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    ).map(([status, count]) => ({ status, count })),
    topProducts: Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    recentOrders: orders.slice(0, 5),
  });
}
