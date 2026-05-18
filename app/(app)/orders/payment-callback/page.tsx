import Link from "next/link";
import { redirect } from "next/navigation";
import { authedFetch } from "@/lib/api/proxy";

type PaymentCallbackPageProps = {
  searchParams: Promise<{
    OrderTrackingId?: string;
    OrderMerchantReference?: string;
  }>;
};

type CallbackResponse = {
  success?: boolean;
  paid?: boolean;
  paymentStatus?: string;
  orderId?: string;
  order_id?: string;
  id?: string;
  error?: string;
  message?: string;
};

function getOrderId(data: CallbackResponse) {
  return data.orderId || data.order_id || data.id || "";
}

export default async function PaymentCallbackPage({
  searchParams,
}: PaymentCallbackPageProps) {
  const { OrderTrackingId, OrderMerchantReference } = await searchParams;

  if (!OrderTrackingId || !OrderMerchantReference) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Invalid payment callback
        </h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Missing Pesapal payment reference details.
        </p>

        <Link href="/orders" className="mt-6 inline-block underline">
          Go to orders
        </Link>
      </main>
    );
  }

  const query = new URLSearchParams({
    OrderTrackingId,
    OrderMerchantReference,
  });

  const res = await authedFetch(
    `/api/v1/orders/payment-callback?${query.toString()}`,
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    console.error("Payment callback verification failed", {
      status: res.status,
      body,
      OrderTrackingId,
      OrderMerchantReference,
    });

    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Payment verification failed
        </h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          We could not verify this payment yet.
        </p>

        <div className="mt-4 rounded border border-zinc-200 p-3 text-xs dark:border-zinc-800">
          <p>Tracking ID: {OrderTrackingId}</p>
          <p>Merchant Reference: {OrderMerchantReference}</p>
        </div>

        <Link href="/orders" className="mt-6 inline-block underline">
          View orders
        </Link>
      </main>
    );
  }

  const data = (await res.json()) as CallbackResponse;
  const orderId = getOrderId(data);

  if (!orderId) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Payment received
        </h1>

        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Payment callback completed, but no order ID was returned.
        </p>

        <Link href="/orders" className="mt-6 inline-block underline">
          View orders
        </Link>
      </main>
    );
  }

  const paymentState =
    data.paid === true || data.paymentStatus === "paid" ? "success" : "pending";

  redirect(`/orders/${encodeURIComponent(orderId)}?payment=${paymentState}`);
}