"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, formatPrice } from "@/lib/utils";

type PaymentRow = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  orderPaymentStatus: string;
  maskedPhone: string;
  amount: number;
  currency: string;
  providerReference: string;
  status: string;
  failureReason: string;
  reconciliation: string;
  verifiedAt?: string | null;
  updatedAt: string;
};

type Totals = {
  currency: string;
  today: number;
  month: number;
  pendingCount: number;
  failedCount: number;
};

const STATUS_OPTIONS = [
  "",
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
];

function statusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(
        `/api/admin/payments/mobile-money?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string })?.error || "Failed to load payments.",
        );
        return;
      }
      setItems((data as { items?: PaymentRow[] }).items ?? []);
      setTotals((data as { totals?: Totals }).totals ?? null);
    } catch {
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function reconcile(id: string) {
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      const res = await fetch(
        `/api/admin/payments/mobile-money/${encodeURIComponent(id)}/reconcile`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string })?.error || "Recheck failed.");
        return;
      }
      setMessage(
        `Rechecked with ioTec: now ${(data as { status?: string }).status}.`,
      );
      await load();
    } catch {
      setError("Recheck failed. Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  const currency = (totals?.currency || "UGX").toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Mobile money payments
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ioTec collections. An order is marked paid only after the payment is
            verified with ioTec.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-500">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All"}
                </option>
              ))}
            </select>
          </label>
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
      {message ? (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Received today",
            totals ? formatPrice(totals.today, currency) : "...",
          ],
          [
            "Received this month",
            totals ? formatPrice(totals.month, currency) : "...",
          ],
          ["Pending collections", totals ? String(totals.pendingCount) : "..."],
          ["Failed / cancelled", totals ? String(totals.failedCount) : "..."],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">ioTec reference</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={9}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-zinc-500" colSpan={9}>
                  No payments match these filters.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-4 py-3 font-medium">{row.orderNumber}</td>
                  <td className="px-4 py-3">{row.customerEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.maskedPhone}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatPrice(row.amount, row.currency)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.providerReference || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                    {row.failureReason ? (
                      <p className="mt-1 max-w-xs text-xs text-zinc-500">
                        {row.failureReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.reconciliation === "refund_review"
                      ? "Refund review"
                      : row.verifiedAt
                        ? `Verified ${formatDate(row.verifiedAt, "datetime")}`
                        : "Unverified"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatDate(row.updatedAt, "datetime")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => reconcile(row.id)}
                      disabled={
                        busyId === row.id ||
                        !row.providerReference ||
                        row.status === "succeeded"
                      }
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-zinc-700"
                    >
                      {busyId === row.id ? "Checking…" : "Recheck"}
                    </button>
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
