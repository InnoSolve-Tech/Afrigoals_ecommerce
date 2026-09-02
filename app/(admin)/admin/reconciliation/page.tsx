"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ApiOrder } from "@/lib/api/types";
import { formatDate, formatPrice } from "@/lib/utils";

type ProductReconciliation = {
  productId: string;
  productName: string;
  units: number;
  grossSales: number;
  orderCount: number;
};

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

export default function AdminReconciliationPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as any)?.error || "Failed to load orders.");
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const currency = orders[0]?.currency?.toLowerCase() || "ugx";
  const paidOrders = useMemo(() => orders.filter(isPaidOrder), [orders]);

  const totals = useMemo(() => {
    return paidOrders.reduce(
      (acc, order) => {
        acc.productSales += Number(order.subtotal || 0);
        acc.deliveryFees += Number(order.deliveryFee || 0);
        return acc;
      },
      { productSales: 0, deliveryFees: 0 },
    );
  }, [paidOrders]);

  const productRows = useMemo(() => {
    const rows = new Map<string, ProductReconciliation>();

    for (const order of paidOrders) {
      const seenInOrder = new Set<string>();

      for (const item of order.items || []) {
        const productId = item.productId || "unknown";
        const row =
          rows.get(productId) ||
          {
            productId,
            productName: item.productName || "Unknown product",
            units: 0,
            grossSales: 0,
            orderCount: 0,
          };

        row.units += Number(item.quantity || 0);
        row.grossSales += Number(
          item.lineSubtotal ?? item.total ?? item.priceAtPurchase * item.quantity,
        );

        if (!seenInOrder.has(productId)) {
          row.orderCount += 1;
          seenInOrder.add(productId);
        }

        rows.set(productId, row);
      }
    }

    return Array.from(rows.values()).sort((a, b) => b.grossSales - a.grossSales);
  }, [paidOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Reconciliation
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Match paid orders to product sales and delivery collections.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Paid orders", String(paidOrders.length)],
          ["Product sales", formatPrice(totals.productSales, currency)],
          ["Delivery fees", formatPrice(totals.deliveryFees, currency)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {loading ? "..." : value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : productRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={4}>
                  No paid product sales yet.
                </td>
              </tr>
            ) : (
              productRows.map((row) => (
                <tr
                  key={row.productId}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {row.productName}
                    </p>
                    <p className="text-xs text-zinc-500">{row.productId}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{row.orderCount}</td>
                  <td className="px-4 py-3 text-right">{row.units}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatPrice(row.grossSales, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Paid Order Register
          </h2>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {paidOrders.slice(0, 25).map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {order.orderNumber}
                </p>
                <p className="text-zinc-500">
                  {order.email} - {formatDate(order.createdAt, "datetime")}
                </p>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {formatPrice(order.total, currency)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
