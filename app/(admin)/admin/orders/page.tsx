"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthState } from "@/lib/auth/client";
import type { ApiOrder } from "@/lib/api/types";
import { formatPrice, formatDate } from "@/lib/utils";
import { ORDER_STATUSES, formatOrderStatus } from "@/lib/orders/status";

export default function AdminOrdersPage() {
  const { status, user } = useAuthState();
  const isAdmin = user?.role === "admin";

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const res = await fetch(`/api/admin/orders${qs}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as any)?.error || `Failed to load orders (${res.status})`,
        );
        setOrders([]);
        return;
      }
      setOrders(data as ApiOrder[]);
    } catch {
      setError("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "loading" && isAdmin) {
      loadOrders();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAdmin, statusFilter]);

 async function updateStatus(orderId: string, newStatus: string) {
  setError(null);

  if (!orderId || orderId === "undefined" || orderId === "null") {
    setError("Invalid order id.");
    console.error("Status update blocked: invalid order id", {
      orderId,
      newStatus,
    });
    return;
  }

  console.log("Calling status update API", {
    url: `/api/admin/orders/${orderId}/status`,
    orderId,
    newStatus,
  });

  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });

  const data = await res.json().catch(() => ({}));

  console.log("Status update API response", {
    status: res.status,
    data,
  });

  if (!res.ok) {
    setError((data as any)?.error || "Failed to update status");
    return;
  }

  await loadOrders();
}

  if (status === "loading")
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-red-600 dark:text-red-400">Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Orders
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track purchases and update logistics stages.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Filter by status (optional)"
            className="w-56"
          />
          <Button variant="outline" onClick={loadOrders} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3">Stage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                  colSpan={5}
                >
                  Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                  colSpan={5}
                >
                  No orders.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium underline"
                      href={`/orders/${o.id}`}
                    >
                      {o.orderNumber}
                    </Link>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {o.items?.length ?? 0} item(s)
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-900 dark:text-zinc-100">
                      {o.email}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {o.userId}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(o.total, o.currency?.toLowerCase() || "ugx")}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(o.createdAt, "datetime")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {formatOrderStatus(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
