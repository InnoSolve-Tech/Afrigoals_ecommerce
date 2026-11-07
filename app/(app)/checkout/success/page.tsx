// app/checkout/success/page.tsx
import { redirect } from "next/navigation";
import { SuccessClient } from "./SuccessClient";

export const metadata = {
  title: "Order Confirmed | AfriGoals Store",
  description: "Your order has been placed successfully",
};

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
    paymentMethod?: string;
    order?: string;
    orderNumber?: string;
  }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id ?? null;
  const paymentMethod = params.paymentMethod ?? "mobile_money";
  const orderNumber = params.orderNumber ?? params.order ?? null;

  if (
    (paymentMethod !== "cod" && paymentMethod !== "mobile_money") ||
    !orderNumber
  ) {
    redirect("/orders");
  }

  return (
    <SuccessClient
      sessionId={sessionId}
      paymentMethod={paymentMethod}
      orderNumber={orderNumber}
    />
  );
}
