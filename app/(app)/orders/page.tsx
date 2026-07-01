import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authedFetch } from "@/lib/api/proxy";
import type { ApiOrder } from "@/lib/api/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { formatOrderStatus } from "@/lib/orders/status";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Your Orders | AfriGoals Store",
  description: "View your order history",
};

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

type OrderItemVariant = {
  key?: string | null;
  _key?: string | null;
  id?: string | null;
  size?: string | null;
  color?: string | null;
  colour?: string | null;
};

type FlexibleApiOrderItem = ApiOrder["items"][number] & {
  accessoriesJson?: string;
  accessories_json?: string;
  accessoriesFee?: number;
  accessories_fee?: number;
  lineSubtotal?: number;
  line_subtotal?: number;

  variantKey?: string | null;
  variant_key?: string | null;
  VariantKey?: string | null;

  selectedSize?: string | null;
  selected_size?: string | null;
  SelectedSize?: string | null;
  size?: string | null;
  Size?: string | null;

  selectedColor?: string | null;
  selected_color?: string | null;
  SelectedColor?: string | null;
  color?: string | null;
  colour?: string | null;
  Color?: string | null;
  Colour?: string | null;

  variantJson?: string | null;
  variant_json?: string | null;
  variant?: OrderItemVariant | string | null;
};

type FlexibleApiOrder = ApiOrder & {
  ID?: string;
  order_number?: string;
  created_at?: string;
  items?: FlexibleApiOrderItem[];
};

function getOrderId(order: FlexibleApiOrder) {
  return order.id || order.ID || "";
}

function getOrderNumber(order: FlexibleApiOrder) {
  return order.orderNumber || order.order_number || getOrderId(order);
}

function getCreatedAt(order: FlexibleApiOrder) {
  return order.createdAt || order.created_at || "";
}

function getAccessoriesJson(item: FlexibleApiOrderItem) {
  return item.accessoriesJson || item.accessories_json || "";
}

function getAccessoriesFee(item: FlexibleApiOrderItem) {
  return Number(item.accessoriesFee ?? item.accessories_fee ?? 0);
}

function getLineSubtotal(item: FlexibleApiOrderItem) {
  return Number(item.lineSubtotal ?? item.line_subtotal ?? 0);
}

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

function cleanVariantText(value?: string | null) {
  const cleaned = String(value || "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseOrderItemVariantJson(raw?: string | OrderItemVariant | null) {
  if (!raw) return null;

  if (typeof raw === "object") {
    return raw;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as OrderItemVariant;
  } catch {
    return null;
  }
}

function getVariantObject(item: FlexibleApiOrderItem) {
  if (item.variant && typeof item.variant === "object") {
    return item.variant;
  }

  if (typeof item.variant === "string") {
    return parseOrderItemVariantJson(item.variant);
  }

  return parseOrderItemVariantJson(item.variantJson || item.variant_json);
}

function getOrderItemVariantKey(item: FlexibleApiOrderItem) {
  const variant = getVariantObject(item);

  return cleanVariantText(
    item.variantKey ||
      item.variant_key ||
      item.VariantKey ||
      variant?.key ||
      variant?._key ||
      variant?.id,
  );
}

function getOrderItemSize(item: FlexibleApiOrderItem) {
  const variant = getVariantObject(item);

  return cleanVariantText(
    item.selectedSize ||
      item.selected_size ||
      item.SelectedSize ||
      item.size ||
      item.Size ||
      variant?.size,
  );
}

function getOrderItemColor(item: FlexibleApiOrderItem) {
  const variant = getVariantObject(item);

  return cleanVariantText(
    item.selectedColor ||
      item.selected_color ||
      item.SelectedColor ||
      item.color ||
      item.colour ||
      item.Color ||
      item.Colour ||
      variant?.color ||
      variant?.colour,
  );
}

function orderItemHasVariant(item: FlexibleApiOrderItem) {
  return Boolean(
    getOrderItemVariantKey(item) ||
      getOrderItemSize(item) ||
      getOrderItemColor(item),
  );
}

function orderHasVariants(order: FlexibleApiOrder) {
  return Boolean(order.items?.some((item) => orderItemHasVariant(item)));
}

function OrderItemVariantBadges({ item }: { item: FlexibleApiOrderItem }) {
  const size = getOrderItemSize(item);
  const color = getOrderItemColor(item);

  if (!orderItemHasVariant(item)) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {size ? (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Size: {size}
        </span>
      ) : null}

      {color ? (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Colour: {color}
        </span>
      ) : null}
    </div>
  );
}

function orderHasAccessories(order: FlexibleApiOrder) {
  return Boolean(
    order.items?.some(
      (item) => parseOrderItemAccessories(getAccessoriesJson(item)).length > 0,
    ),
  );
}

export default async function OrdersPage() {
  const res = await authedFetch("/orders/my");

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

  const orders = (await res.json()) as FlexibleApiOrder[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Your Orders
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track purchases, delivery, product variants, and customization
            details.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          You have no orders yet.
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const orderId = getOrderId(order);
            const orderNumber = getOrderNumber(order);
            const createdAt = getCreatedAt(order);
            const items = order.items || [];
            const hasAccessories = orderHasAccessories(order);
            const hasVariants = orderHasVariants(order);

            if (!orderId) {
              return null;
            }

            return (
              <div
                key={orderId}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      href={`/orders/${encodeURIComponent(orderId)}`}
                      className="text-base font-semibold text-zinc-900 underline underline-offset-4 hover:text-primary dark:text-zinc-100"
                    >
                      {orderNumber}
                    </Link>

                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{items.length} item(s)</span>
                      <span>•</span>
                      <span>
                        {createdAt ? formatDate(createdAt, "datetime") : "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {hasAccessories ? (
                        <div className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          Includes customization
                        </div>
                      ) : null}

                      {hasVariants ? (
                        <div className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Includes variants
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:items-end">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatOrderStatus(order.status)}
                    </span>

                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatPrice(
                        order.total,
                        order.currency?.toLowerCase() || "ugx",
                      )}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {items.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      No item details available for this order.
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const accessories = parseOrderItemAccessories(
                        getAccessoriesJson(item),
                      );

                      const baseLineTotal =
                        Number(item.priceAtPurchase || 0) *
                        Number(item.quantity || 1);

                      const accessoriesFee =
                        getAccessoriesFee(item) * Number(item.quantity || 1);

                      const lineSubtotal =
                        getLineSubtotal(item) ||
                        baseLineTotal + accessoriesFee;

                      return (
                        <div
                          key={
                            item.id ||
                            `${item.productId || item.productName}-${index}`
                          }
                          className="px-5 py-4"
                        >
                          <div className="flex gap-4">
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.productName || "Product image"}
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
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {item.productName}
                                  </p>

                                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    Qty: {item.quantity}
                                  </p>

                                  <OrderItemVariantBadges item={item} />

                                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    Unit price:{" "}
                                    {formatPrice(
                                      item.priceAtPurchase,
                                      order.currency,
                                    )}
                                  </p>
                                </div>

                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-right">
                                  {formatPrice(lineSubtotal, order.currency)}

                                  {accessories.length > 0 ? (
                                    <p className="mt-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                      Includes accessories
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
                                        key={`${accessory.accessoryId}-${accessory.code}-${accessory.text}-${accessory.number}`}
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
                                            {formatPrice(
                                              accessory.total,
                                              order.currency,
                                            )}
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
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <Button asChild size="sm">
                    <Link href={`/orders/${encodeURIComponent(orderId)}`}>
                      View full order
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}