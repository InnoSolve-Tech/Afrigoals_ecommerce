import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  MapPin,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authedFetch } from "@/lib/api/proxy";
import type { ApiOrder } from "@/lib/api/types";
import { formatOrderStatus } from "@/lib/orders/status";
import { formatDate, formatPrice } from "@/lib/utils";
import { OrderDeliveryContactEditor } from "../orderDeliveryContactEditor";

export const metadata = {
  title: "Order Details | AfriGoals Store",
  description: "View your order details",
};

interface OrderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}

type OrderItemAccessory = {
  accessoryId: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  text?: string;
  number?: string;
  notes?: string;
};

type FlexibleOrderItem = ApiOrder["items"][number] & {
  accessoriesJson?: string;
  accessories_json?: string;
  accessoriesFee?: number;
  accessories_fee?: number;
  lineSubtotal?: number;
  line_subtotal?: number;
};

type FlexibleApiOrder = ApiOrder & {
  paymentStatus?: string;
  payment_status?: string;
};

const ORDER_PROGRESS_STEPS = [
  {
    key: "pending",
    label: "Pending",
    description: "Order received",
  },
  {
    key: "processing",
    label: "Processing",
    description: "Order being prepared",
  },
  {
    key: "packed",
    label: "Packed",
    description: "Items packed",
  },
  {
    key: "shipped",
    label: "Shipped",
    description: "Order dispatched",
  },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    description: "On the way",
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Order completed",
  },
] as const;

function parseOrderItemAccessories(raw?: string | null): OrderItemAccessory[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        accessoryId: String(item.accessoryId || item.AccessoryID || ""),
        code: String(item.code || item.Code || ""),
        name: String(item.name || item.Name || ""),
        quantity: Number(item.quantity || item.Quantity || 1),
        unitPrice: Number(item.unitPrice || item.UnitPrice || 0),
        total: Number(item.total || item.Total || 0),
        text: item.text || item.Text || "",
        number: item.number || item.Number || "",
        notes: item.notes || item.Notes || "",
      }))
      .filter((item) => item.accessoryId || item.name || item.code);
  } catch {
    return [];
  }
}

function getAccessoriesJson(item: FlexibleOrderItem) {
  return item.accessoriesJson || item.accessories_json || "";
}

function getAccessoriesFee(item: FlexibleOrderItem) {
  return Number(item.accessoriesFee ?? item.accessories_fee ?? 0);
}

function getLineSubtotal(item: FlexibleOrderItem) {
  return Number(item.lineSubtotal ?? item.line_subtotal ?? 0);
}

function normalizeOrderStatus(status: string | undefined | null) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function normalizePaymentStatus(status: string | undefined | null) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getOrderPaymentStatus(order: FlexibleApiOrder) {
  const normalizedOrderStatus = normalizeOrderStatus(order.status);

  if (normalizedOrderStatus === "paid") {
    return "paid";
  }

  if (normalizedOrderStatus === "payment_failed") {
    return "payment_failed";
  }

  const rawPaymentStatus = order.paymentStatus || order.payment_status;
  const normalizedPaymentStatus = normalizePaymentStatus(rawPaymentStatus);

  if (normalizedPaymentStatus) {
    return normalizedPaymentStatus;
  }

  const paymentMethod = normalizePaymentStatus(order.paymentMethod);

  if (paymentMethod === "pesapal" || paymentMethod === "online") {
    return "paid";
  }

  if (paymentMethod === "cod" || paymentMethod === "cash_on_delivery") {
    return "unpaid";
  }

  return "unpaid";
}

function isCancelledStatus(status: string | undefined | null) {
  const normalizedStatus = normalizeOrderStatus(status);

  return normalizedStatus === "cancelled" || normalizedStatus === "canceled";
}

function isPaymentFailedStatus(status: string | undefined | null) {
  return normalizeOrderStatus(status) === "payment_failed";
}

function getOrderProgressIndex(status: string | undefined | null) {
  const normalizedStatus = normalizeOrderStatus(status);

  if (
    isCancelledStatus(normalizedStatus) ||
    isPaymentFailedStatus(normalizedStatus)
  ) {
    return -1;
  }

  if (normalizedStatus === "paid") {
    return ORDER_PROGRESS_STEPS.findIndex((step) => step.key === "delivered");
  }

  if (normalizedStatus === "unpaid") {
    return ORDER_PROGRESS_STEPS.findIndex((step) => step.key === "pending");
  }

  const index = ORDER_PROGRESS_STEPS.findIndex(
    (step) => step.key === normalizedStatus,
  );

  return index >= 0 ? index : 0;
}

function getVisibleOrderProgressStage(status: string | undefined | null) {
  const normalizedStatus = normalizeOrderStatus(status);

  if (normalizedStatus === "paid") {
    return "Delivered";
  }

  if (normalizedStatus === "unpaid") {
    return "Pending";
  }

  if (normalizedStatus === "payment_failed") {
    return "Payment failed";
  }

  return formatOrderStatus(normalizedStatus || "pending");
}

function PaymentStatusBadge({
  paymentStatus,
  paymentMethod,
}: {
  paymentStatus?: string | null;
  paymentMethod?: string | null;
}) {
  const normalizedPaymentStatus = normalizePaymentStatus(paymentStatus);
  const normalizedPaymentMethod = normalizePaymentStatus(paymentMethod);

  const isPaid = normalizedPaymentStatus === "paid";
  const isPaymentFailed = normalizedPaymentStatus === "payment_failed";

  const label = isPaymentFailed ? "Payment failed" : isPaid ? "Paid" : "Unpaid";

  const description = isPaymentFailed
    ? "Payment was not completed"
    : isPaid
      ? normalizedPaymentMethod === "pesapal"
        ? "Paid online through Pesapal"
        : "Payment received"
      : normalizedPaymentMethod === "cod" ||
          normalizedPaymentMethod === "cash_on_delivery"
        ? "Cash to be collected on delivery"
        : "Payment not yet received";

  return (
    <div
      className={[
        "rounded-lg border p-4",
        isPaymentFailed
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : isPaid
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
            : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {isPaymentFailed ? (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        ) : isPaid ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        )}

        <div>
          <p
            className={[
              "font-semibold",
              isPaymentFailed
                ? "text-red-800 dark:text-red-300"
                : isPaid
                  ? "text-green-800 dark:text-green-300"
                  : "text-amber-800 dark:text-amber-300",
            ].join(" ")}
          >
            Payment Status: {label}
          </p>

          <p
            className={[
              "mt-0.5 text-sm",
              isPaymentFailed
                ? "text-red-700 dark:text-red-400"
                : isPaid
                  ? "text-green-700 dark:text-green-400"
                  : "text-amber-700 dark:text-amber-400",
            ].join(" ")}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function OrderProgressTracker({ status }: { status?: string | null }) {
  const normalizedStatus = normalizeOrderStatus(status);

  const isCancelled = isCancelledStatus(normalizedStatus);
  const isPaymentFailed = isPaymentFailedStatus(normalizedStatus);

  const currentIndex = getOrderProgressIndex(status);

  const progressPercent =
    isCancelled || isPaymentFailed
      ? 100
      : (currentIndex / (ORDER_PROGRESS_STEPS.length - 1)) * 100;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Order Progress
          </h2>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Current stage: {getVisibleOrderProgressStage(status)}
          </p>
        </div>

        {isCancelled ? (
          <span className="inline-flex w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            Cancelled
          </span>
        ) : null}

        {isPaymentFailed ? (
          <span className="inline-flex w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            Payment failed
          </span>
        ) : null}
      </div>

      {isCancelled ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          This order was cancelled. No further delivery progress will continue.
        </div>
      ) : isPaymentFailed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Payment failed. This order cannot continue until payment is resolved.
        </div>
      ) : (
        <>
          <div className="relative hidden sm:block">
            <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />

            <div
              className="absolute left-0 top-5 h-1 rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
              style={{ width: `${progressPercent}%` }}
            />

            <div className="relative grid grid-cols-6 gap-2">
              {ORDER_PROGRESS_STEPS.map((step, index) => {
                const completed = index <= currentIndex;
                const active = index === currentIndex;

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={[
                        "z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition dark:bg-zinc-950",
                        completed
                          ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                          : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500",
                        active ? "ring-4 ring-blue-100 dark:ring-blue-950" : "",
                      ].join(" ")}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>

                    <p
                      className={[
                        "mt-3 text-xs font-semibold",
                        completed
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 dark:text-zinc-500",
                      ].join(" ")}
                    >
                      {step.label}
                    </p>

                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 sm:hidden">
            {ORDER_PROGRESS_STEPS.map((step, index) => {
              const completed = index <= currentIndex;
              const active = index === currentIndex;

              return (
                <div key={step.key} className="flex gap-3">
                  <div
                    className={[
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      completed
                        ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                        : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500",
                      active ? "bg-blue-50 dark:bg-blue-950/40" : "",
                    ].join(" ")}
                  >
                    {completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </div>

                  <div>
                    <p
                      className={[
                        "text-sm font-semibold",
                        completed
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 dark:text-zinc-500",
                      ].join(" ")}
                    >
                      {step.label}
                    </p>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PaymentBanner({ payment }: { payment?: string }) {
  if (!payment) return null;

  if (payment === "success") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 dark:border-green-800 dark:bg-green-950/40">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="font-semibold text-green-800 dark:text-green-300">
            Payment received successfully!
          </p>
          <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
            Thank you for your purchase. Your order has been confirmed and is
            being processed.
          </p>
        </div>
      </div>
    );
  }

  if (payment === "pending") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Payment is being processed
          </p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
            Your payment is pending confirmation. This page will update once
            your payment is verified.
          </p>
        </div>
      </div>
    );
  }

  if (payment === "already_paid") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 dark:border-green-800 dark:bg-green-950/40">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="font-semibold text-green-800 dark:text-green-300">
            This order has already been paid
          </p>
          <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
            Your order is confirmed and being processed.
          </p>
        </div>
      </div>
    );
  }

  if (payment === "failed") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-800 dark:bg-red-950/40">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <p className="font-semibold text-red-800 dark:text-red-300">
            Payment was not completed
          </p>
          <p className="mt-0.5 text-sm text-red-700 dark:text-red-400">
            Your payment could not be processed. Please try again or contact
            support.
          </p>
        </div>
      </div>
    );
  }

  if (payment === "cod") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/40">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Cash on delivery order placed
          </p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
            You will pay in cash when your order is delivered.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

function canEditDeliveryContact(status: string | undefined) {
  return ![
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "paid",
    "cancelled",
    "canceled",
    "payment_failed",
  ].includes(normalizeOrderStatus(status));
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderPageProps) {
  const { id } = await params;
  const { payment } = await searchParams;

  const res = await authedFetch(`/api/v1/orders/${encodeURIComponent(id)}`);

  if (res.status === 401) {
    redirect(`/signin?next=${encodeURIComponent(`/orders/${id}`)}`);
  }

  if (!res.ok) {
    notFound();
  }

  const order = (await res.json()) as FlexibleApiOrder;
  const items = (order.items || []) as FlexibleOrderItem[];

  const paymentStatus = getOrderPaymentStatus(order);

  const totalAccessoriesFee = items.reduce(
    (sum, item) => sum + getAccessoriesFee(item) * Number(item.quantity || 1),
    0,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/orders"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Order {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Placed on {formatDate(order.createdAt, "datetime")}
            </p>
          </div>

          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formatOrderStatus(order.status)}
          </div>
        </div>
      </div>

      <PaymentBanner payment={payment} />

      <div className="space-y-6">
        <PaymentStatusBadge
          paymentStatus={paymentStatus}
          paymentMethod={order.paymentMethod}
        />

        <OrderProgressTracker status={order.status} />

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Items
          </h2>

          <div className="space-y-5">
            {items.map((item) => {
              const accessories = parseOrderItemAccessories(
                getAccessoriesJson(item),
              );

              const baseLineTotal =
                Number(item.priceAtPurchase || 0) * Number(item.quantity || 1);

              const accessoriesFee =
                getAccessoriesFee(item) * Number(item.quantity || 1);

              const lineSubtotal =
                getLineSubtotal(item) || baseLineTotal + accessoriesFee;

              return (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-zinc-100 pb-5 last:border-b-0 last:pb-0 dark:border-zinc-800"
                >
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName ?? "Product image"}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.productName}
                        </h3>

                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Qty: {item.quantity}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Unit price:{" "}
                          {formatPrice(item.priceAtPurchase, order.currency)}
                        </p>
                      </div>

                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-right">
                        {formatPrice(lineSubtotal, order.currency)}

                        {accessories.length > 0 ? (
                          <p className="mt-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                            Includes customization
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {accessories.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Customization / Accessories
                        </p>

                        <div className="space-y-3">
                          {accessories.map((accessory) => (
                            <div
                              key={`${accessory.accessoryId}-${accessory.code}`}
                              className="rounded-md bg-white p-3 text-sm dark:bg-zinc-950"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {accessory.name ||
                                      accessory.code ||
                                      "Accessory"}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    Qty: {accessory.quantity}
                                    {accessory.unitPrice > 0
                                      ? ` • ${formatPrice(
                                          accessory.unitPrice,
                                          order.currency,
                                        )} each`
                                      : ""}
                                  </p>
                                </div>

                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                  {formatPrice(accessory.total, order.currency)}
                                </p>
                              </div>

                              {accessory.text ||
                              accessory.number ||
                              accessory.notes ? (
                                <div className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                                  {accessory.text ? (
                                    <p>
                                      Name/Text:{" "}
                                      <span className="font-medium">
                                        {accessory.text}
                                      </span>
                                    </p>
                                  ) : null}

                                  {accessory.number ? (
                                    <p>
                                      Number:{" "}
                                      <span className="font-medium">
                                        {accessory.number}
                                      </span>
                                    </p>
                                  ) : null}

                                  {accessory.notes ? (
                                    <p>
                                      Notes:{" "}
                                      <span className="font-medium">
                                        {accessory.notes}
                                      </span>
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Subtotal
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {formatPrice(order.subtotal, order.currency)}
                </span>
              </div>

              {totalAccessoriesFee > 0 ? (
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Customization included
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatPrice(totalAccessoriesFee, order.currency)}
                  </span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Delivery
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {formatPrice(order.deliveryFee, order.currency)}
                </span>
              </div>

              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <div className="flex justify-between font-semibold">
                  <span className="text-zinc-900 dark:text-zinc-100">
                    Total
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatPrice(order.total, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-zinc-400" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Delivery
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Address
                </span>
                <p className="mt-1 text-zinc-900 dark:text-zinc-100">
                  {order.deliveryAddress || "—"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Distance
                  </span>
                  <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {typeof order.deliveryDistanceKm === "number"
                      ? `${order.deliveryDistanceKm.toFixed(2)} km`
                      : "—"}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Delivery fee
                  </span>
                  <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPrice(order.deliveryFee, order.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <OrderDeliveryContactEditor
              orderId={order.id}
              deliveryContactName={order.deliveryContactName}
              deliveryContactPhone={order.deliveryContactPhone}
              deliveryAltPhone={order.deliveryAltPhone}
              deliveryNote={order.deliveryNote}
              editable={canEditDeliveryContact(order.status)}
            />
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-zinc-400" />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Payment
              </h2>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4 sm:block">
                <span className="text-xs font-light tracking-wide text-zinc-500 dark:text-zinc-400">
                  Payment Status
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 sm:block">
                  {paymentStatus === "paid"
                    ? "Paid"
                    : paymentStatus === "payment_failed"
                      ? "Payment failed"
                      : "Unpaid"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 sm:block">
                <span className="text-xs font-light tracking-wide text-zinc-500 dark:text-zinc-400">
                  Order Status
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 sm:block">
                  {formatOrderStatus(order.status)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 sm:block">
                <span className="text-xs font-light tracking-wide text-zinc-500 dark:text-zinc-400">
                  Method
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 sm:block">
                  {order.paymentMethod || "—"}
                </span>
              </div>

              {order.paidAt ? (
                <div className="flex items-center justify-between gap-4 sm:block">
                  <span className="text-xs font-light tracking-wide text-zinc-500 dark:text-zinc-400">
                    Paid on
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 sm:block">
                    {formatDate(order.paidAt, "datetime")}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4 sm:block">
                <span className="text-xs font-light tracking-wide text-zinc-500 dark:text-zinc-400">
                  Email
                </span>
                <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100 sm:block">
                  {order.email || "—"}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}