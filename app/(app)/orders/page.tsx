import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authedFetch } from "@/lib/api/proxy";
import type { ApiOrder } from "@/lib/api/types";
import { formatOrderStatus } from "@/lib/orders/status";
import { buildMetadata } from "@/lib/seo";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Your Orders",
  description: "View your order history",
  path: "/orders",
  index: false,
});

export default async function OrdersPage() {
  const res = await authedFetch("/api/v1/orders/my");
  if (res.status === 401) {
    redirect("/signin?next=/orders");
  }
  if (!res.ok) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load orders.
        </p>
      </div>
    );
  }

  const orders = (await res.json()) as ApiOrder[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Your Orders
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track and manage your purchases
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You have no orders yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
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
                  <td className="px-4 py-3">{formatOrderStatus(o.status)}</td>
                  <td className="px-4 py-3">
                    {formatPrice(o.total, o.currency?.toLowerCase() || "ugx")}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(o.createdAt, "datetime")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
