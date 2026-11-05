"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ApiOrder } from "@/lib/api/types";
import { formatPrice, formatDate } from "@/lib/utils";

type InsightResponse = {
  success: boolean;
  error?: string;
  currency: string;
  totals: {
    orders: number;
    paidOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    revenue: number;
    deliveryFees: number;
    averageOrderValue: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    units: number;
    revenue: number;
  }>;
  recentOrders: ApiOrder[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<InsightResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadInsights() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/insights", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as InsightResponse;

      if (!res.ok || !body.success) {
        setError(body.error || "Failed to load dashboard statistics.");
        setData(null);
        return;
      }

      setData(body);
    } catch {
      setError("Failed to load dashboard statistics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInsights();
  }, []);

  const currency = data?.currency?.toLowerCase() || "ugx";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Operational sales, order flow, and product performance.
          </p>
        </div>
        <Button variant="outline" onClick={loadInsights} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin/products">Manage products</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/orders">Track orders</Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Revenue", data ? formatPrice(data.totals.revenue, currency) : "..."],
          ["Orders", data ? String(data.totals.orders) : "..."],
          ["Pending", data ? String(data.totals.pendingOrders) : "..."],
          [
            "Avg. order",
            data ? formatPrice(data.totals.averageOrderValue, currency) : "...",
          ],
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

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Top Products
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {(data?.topProducts || []).length === 0 ? (
              <p className="px-5 py-4 text-sm text-zinc-500">No sales yet.</p>
            ) : (
              data?.topProducts.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between gap-4 px-5 py-4 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {product.name}
                    </p>
                    <p className="text-zinc-500">{product.units} units sold</p>
                  </div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(product.revenue, currency)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Orders
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {(data?.recentOrders || []).length === 0 ? (
              <p className="px-5 py-4 text-sm text-zinc-500">No orders yet.</p>
            ) : (
              data?.recentOrders.map((order) => (
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
