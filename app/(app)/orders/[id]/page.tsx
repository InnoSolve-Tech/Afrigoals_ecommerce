import {
  ArrowLeft,
  CheckCircle2,
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
  return !["shipped", "out_for_delivery", "delivered", "cancelled"].includes(
    String(status || "").toLowerCase(),
  );
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

  const order = (await res.json()) as ApiOrder;
  const items = (order.items || []) as FlexibleOrderItem[];

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
                  Status
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