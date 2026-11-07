"use server";

import { createCashOnDeliveryOrder } from "@/lib/actions/create-cash-on-delivery-order";

type CartItem = Parameters<typeof createCashOnDeliveryOrder>[0][number];
type DeliveryInput = Omit<
  Parameters<typeof createCashOnDeliveryOrder>[1],
  "fee" | "distanceKm"
>;

export async function createCheckoutSession(
  items: CartItem[],
  delivery: DeliveryInput,
  payerPhone?: string,
) {
  // Go calculates the authoritative delivery fee; no redirect gateway is used.
  return createCashOnDeliveryOrder(
    items,
    { ...delivery, fee: 0, distanceKm: 0 },
    "mobile_money",
    payerPhone ?? delivery.contactPhone,
  );
}
