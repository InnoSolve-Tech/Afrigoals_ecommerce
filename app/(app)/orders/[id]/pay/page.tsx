import { notFound, redirect } from "next/navigation";
import { authedFetch } from "@/lib/api/proxy";
import { MobileMoneyPayClient } from "./MobileMoneyPayClient";

type PayPageOrder = {
  id: string;
  orderNumber: string;
  total: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryContactPhone?: string;
  status?: string;
};

export const metadata = {
  title: "Mobile Money Payment | Afrigoals",
};

export default async function MobileMoneyPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await authedFetch(`/orders/${encodeURIComponent(id)}`);

  if (res.status === 401) {
    redirect(`/signin?next=${encodeURIComponent(`/orders/${id}/pay`)}`);
  }
  if (!res.ok) {
    notFound();
  }

  const order = (await res.json()) as PayPageOrder;

  if (order.paymentStatus === "paid") {
    redirect(
      `/checkout/success?paymentMethod=mobile_money&orderNumber=${encodeURIComponent(order.orderNumber)}`,
    );
  }
  if (order.paymentMethod !== "mobile_money") {
    redirect(`/orders/${encodeURIComponent(id)}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <MobileMoneyPayClient
        orderId={order.id}
        orderNumber={order.orderNumber}
        total={order.total}
        currency={order.currency || "UGX"}
        initialPhone={order.deliveryContactPhone || ""}
      />
    </div>
  );
}
