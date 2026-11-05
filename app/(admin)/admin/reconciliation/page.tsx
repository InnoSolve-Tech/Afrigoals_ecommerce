"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDate, formatPrice } from "@/lib/utils";

type VendorRow = {
  vendor: string;
  orders: number;
  units: number;
  grossSales: number;
  reviewCount: number;
  averageRating: number;
};

type ProductRow = {
  productId: string;
  productName: string;
  vendor: string;
  orders: number;
  units: number;
  grossSales: number;
  reviewCount: number;
  averageRating: number;
};

type ClientRow = {
  email: string;
  userId: string;
  orders: number;
  spend: number;
  lastOrderAt: string;
};

type RegisterRow = {
  id: string;
  orderNumber: string;
  email: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  riderPayout: number;
  commission: number;
  createdAt: string;
};

type Report = {
  currency: string;
  serviceFeeRate: number;
  totals: {
    paidOrders: number;
    productSales: number;
    deliveryFees: number;
    riderPayouts: number;
    deliveryCommission: number;
    unassignedDeliveryFees: number;
    outstandingCod: number;
    averageOrderValue: number;
  };
  byVendor: VendorRow[];
  byProduct: ProductRow[];
  byClient: ClientRow[];
  orders: RegisterRow[];
};

function formatRating(value: number, count: number) {
  if (!count) return "No reviews";
  return `${value.toFixed(1)} (${count})`;
}

export default function AdminReconciliationPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vendor, setVendor] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(
        `/api/admin/reconciliation?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as any)?.error || "Failed to load reconciliation.");
        setReport(null);
        return;
      }

      setReport(data as Report);
    } catch {
      setError("Failed to load reconciliation.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const currency = (report?.currency || "UGX").toLowerCase();
  const totals = report?.totals;

  const vendors = report?.byVendor ?? [];
  const products = (report?.byProduct ?? []).filter(
    (row) => vendor === "all" || row.vendor === vendor,
  );
  const clients = report?.byClient ?? [];
  const register = report?.orders ?? [];

  const summaryCards: Array<[string, string]> = [
    ["Paid orders", String(totals?.paidOrders ?? 0)],
    ["Product sales", formatPrice(totals?.productSales ?? 0, currency)],
    ["Delivery fees", formatPrice(totals?.deliveryFees ?? 0, currency)],
    ["Rider payouts", formatPrice(totals?.riderPayouts ?? 0, currency)],
    [
      `Afrigoals delivery commission (${Math.round(
        (report?.serviceFeeRate ?? 0) * 100,
      )}%)`,
      formatPrice(totals?.deliveryCommission ?? 0, currency),
    ],
    [
      "Unassigned delivery fees",
      formatPrice(totals?.unassignedDeliveryFees ?? 0, currency),
    ],
    ["Outstanding cash on delivery", formatPrice(totals?.outstandingCod ?? 0, currency)],
    ["Average order value", formatPrice(totals?.averageOrderValue ?? 0, currency)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Reconciliation
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Paid orders matched to vendor sales, delivery fees, rider payouts and
            Afrigoals&apos; commission. Cancelled orders are excluded.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="text-xs text-zinc-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => (
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

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Vendor accounts
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : vendors.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                  No paid sales in this period.
                </td>
              </tr>
            ) : (
              vendors.map((row) => (
                <tr
                  key={row.vendor}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.vendor}
                  </td>
                  <td className="px-4 py-3 text-right">{row.orders}</td>
                  <td className="px-4 py-3 text-right">{row.units}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatPrice(row.grossSales, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatRating(row.averageRating, row.reviewCount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Product performance
          </h2>
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="all">All vendors</option>
            {vendors.map((row) => (
              <option key={row.vendor} value={row.vendor}>
                {row.vendor}
              </option>
            ))}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                  No paid product sales in this period.
                </td>
              </tr>
            ) : (
              products.map((row) => (
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
                  <td className="px-4 py-3">{row.vendor}</td>
                  <td className="px-4 py-3 text-right">{row.orders}</td>
                  <td className="px-4 py-3 text-right">{row.units}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatPrice(row.grossSales, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatRating(row.averageRating, row.reviewCount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Client accounts
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Spend</th>
              <th className="px-4 py-3 text-right">Last order</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={4}>
                  No paying clients in this period.
                </td>
              </tr>
            ) : (
              clients.map((row) => (
                <tr
                  key={row.email}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3 text-right">{row.orders}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatPrice(row.spend, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatDate(row.lastOrderAt, "datetime")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Paid order register
          </h2>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {loading ? (
            <p className="px-5 py-4 text-sm text-zinc-500">Loading...</p>
          ) : register.length === 0 ? (
            <p className="px-5 py-4 text-sm text-zinc-500">
              No paid orders in this period.
            </p>
          ) : (
            register.map((order) => (
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
                  <p className="text-xs text-zinc-500">
                    Delivery {formatPrice(order.deliveryFee, currency)} · Rider{" "}
                    {formatPrice(order.riderPayout, currency)} · Commission{" "}
                    {formatPrice(order.commission, currency)}
                  </p>
                </div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatPrice(order.total, currency)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
