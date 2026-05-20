export const ORDER_STATUSES = [
  "unpaid",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "paid",
  "cancelled",
  "payment_failed",
  "pending",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function formatOrderStatus(status: string) {
  const normalizedStatus = normalizeOrderStatus(status);

  switch (normalizedStatus) {
    case "unpaid":
      return "Unpaid";
    case "processing":
      return "Processing";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    case "canceled":
      return "Cancelled";
    case "payment_failed":
      return "Payment failed";
    case "pending":
      return "Pending";
    default:
      return normalizedStatus
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function normalizeOrderStatus(status: string | undefined | null) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function isOrderStatus(status: string): status is OrderStatus {
  return ORDER_STATUSES.includes(normalizeOrderStatus(status) as OrderStatus);
}

export function isCancelledOrderStatus(status: string | undefined | null) {
  const normalizedStatus = normalizeOrderStatus(status);

  return normalizedStatus === "cancelled" || normalizedStatus === "canceled";
}

export function isPaymentFailedOrderStatus(status: string | undefined | null) {
  return normalizeOrderStatus(status) === "payment_failed";
}

export function isPaidOrderStatus(status: string | undefined | null) {
  return normalizeOrderStatus(status) === "paid";
}

export function isUnpaidOrderStatus(status: string | undefined | null) {
  return normalizeOrderStatus(status) === "unpaid";
}

export function isFinalOrderStatus(status: string | undefined | null) {
  const normalizedStatus = normalizeOrderStatus(status);

  return [
    "delivered",
    "paid",
    "cancelled",
    "canceled",
    "payment_failed",
  ].includes(normalizedStatus);
}