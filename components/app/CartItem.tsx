"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { StockBadge } from "@/components/app/StockBadge";
import { Button } from "@/components/ui/button";
import type { StockInfo } from "@/lib/hooks/useCartStock";
import type { CartItem as CartItemType } from "@/lib/store/cart-store";
import { useCartActions } from "@/lib/store/cart-store-provider";
import { cn, formatPrice } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  stockInfo?: StockInfo;
}

type CartAccessoryLike = {
  accessoryId: string;
  quantity?: number;
  text?: string;
  number?: string;
  notes?: string;
  name?: string;
  code?: string;
  unitPrice?: number;
  price?: number;
};

type VariantAwareCartItem = CartItemType & {
  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  size?: string | null;
  color?: string | null;
  colour?: string | null;
  variant?: {
    _key?: string | null;
    id?: string | null;
    size?: string | null;
    color?: string | null;
    colour?: string | null;
  } | null;
};

function cleanText(value?: string | null) {
  const cleaned = String(value || "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function getVariantKey(item: VariantAwareCartItem) {
  return cleanText(item.variantKey || item.variant?._key || item.variant?.id);
}

function getSelectedSize(item: VariantAwareCartItem) {
  return cleanText(item.selectedSize || item.size || item.variant?.size);
}

function getSelectedColor(item: VariantAwareCartItem) {
  return cleanText(
    item.selectedColor ||
      item.color ||
      item.colour ||
      item.variant?.color ||
      item.variant?.colour,
  );
}

function hasVariantSelection(item: VariantAwareCartItem) {
  return Boolean(getSelectedSize(item) || getSelectedColor(item));
}

function hasAccessories(item: CartItemType) {
  return Array.isArray(item.accessories) && item.accessories.length > 0;
}

function getAccessoryUnitPrice(accessory: CartAccessoryLike) {
  return Number(accessory.unitPrice ?? accessory.price ?? 0);
}

function getAccessoryQuantity(accessory: CartAccessoryLike) {
  const quantity = Number(accessory.quantity || 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getItemAccessoriesTotal(item: CartItemType) {
  if (!Array.isArray(item.accessories)) {
    return 0;
  }

  const perProductAccessoriesTotal = item.accessories.reduce(
    (sum, accessory) => {
      const unitPrice = getAccessoryUnitPrice(accessory);
      const accessoryQuantity = getAccessoryQuantity(accessory);

      return sum + unitPrice * accessoryQuantity;
    },
    0,
  );

  return perProductAccessoriesTotal * Number(item.quantity || 1);
}

function getItemBaseTotal(item: CartItemType) {
  return Number(item.price || 0) * Number(item.quantity || 1);
}

function getItemLineTotal(item: CartItemType) {
  return getItemBaseTotal(item) + getItemAccessoriesTotal(item);
}

export function CartItem({ item, stockInfo }: CartItemProps) {
  const { removeItem } = useCartActions();

  const variantItem = item as VariantAwareCartItem;

  const variantKey = getVariantKey(variantItem);
  const selectedSize = getSelectedSize(variantItem);
  const selectedColor = getSelectedColor(variantItem);

  const isOutOfStock = stockInfo?.isOutOfStock ?? false;
  const exceedsStock = stockInfo?.exceedsStock ?? false;
  const currentStock = stockInfo?.currentStock ?? 999;
  const hasIssue = isOutOfStock || exceedsStock;

  const baseTotal = getItemBaseTotal(item);
  const accessoriesTotal = getItemAccessoriesTotal(item);
  const lineTotal = getItemLineTotal(item);

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row dark:border-gray-700 dark:bg-gray-800",
        hasIssue &&
          "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
      )}
    >
      <div
        className={cn(
          "relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-28 dark:bg-zinc-800",
          isOutOfStock && "opacity-50",
        )}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            No image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={item.slug ? `/products/${item.slug}` : "/products"}
              className={cn(
                "line-clamp-2 text-base font-semibold text-foreground transition hover:text-primary",
                isOutOfStock && "text-zinc-400 dark:text-zinc-500",
              )}
            >
              {item.name}
            </Link>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Ready for checkout
            </p>

            {hasVariantSelection(variantItem) ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {selectedSize ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    Size: {selectedSize}
                  </span>
                ) : null}

                {selectedColor ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    Colour: {selectedColor}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-red-500">
                Variant not selected
              </p>
            )}

            {hasAccessories(item) ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Selected accessories
                  </p>

                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(accessoriesTotal)}
                  </p>
                </div>

                <div className="space-y-2">
                  {item.accessories?.map((accessory) => {
                    const unitPrice = getAccessoryUnitPrice(accessory);
                    const accessoryQuantity = getAccessoryQuantity(accessory);
                    const accessoryTotal =
                      unitPrice * accessoryQuantity * Number(item.quantity || 1);

                    return (
                      <div
                        key={`${accessory.accessoryId}-${accessory.text || ""}-${accessory.number || ""}`}
                        className="rounded-md bg-white p-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-zinc-800 dark:text-zinc-100">
                            {accessory.name ||
                              accessory.code ||
                              `Accessory ID: ${accessory.accessoryId}`}
                          </span>

                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatPrice(accessoryTotal)}
                          </span>
                        </div>

                        <p className="mt-1">
                          Qty:{" "}
                          <span className="font-medium">
                            {accessoryQuantity}
                          </span>

                          {unitPrice > 0 ? (
                            <span> • {formatPrice(unitPrice)} each</span>
                          ) : (
                            <span> • Price missing</span>
                          )}
                        </p>

                        {accessory.text ? (
                          <p className="mt-1">
                            Text/name:{" "}
                            <span className="font-medium">
                              {accessory.text}
                            </span>
                          </p>
                        ) : null}

                        {accessory.number ? (
                          <p className="mt-1">
                            Number:{" "}
                            <span className="font-medium">
                              {accessory.number}
                            </span>
                          </p>
                        ) : null}

                        {accessory.notes ? (
                          <p className="mt-1">
                            Notes:{" "}
                            <span className="font-medium">
                              {accessory.notes}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Final accessory pricing is verified again at checkout.
                </p>
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-zinc-400 hover:text-red-500"
            onClick={() =>
              removeItem(
                item.productId,
                variantKey,
                selectedSize,
                selectedColor,
              )
            }
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remove {item.name}</span>
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Unit price
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {formatPrice(item.price)}
              </p>
            </div>

            <StockBadge productId={item.productId} stock={currentStock} />
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between gap-4 lg:justify-end">
                <span>Products</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatPrice(baseTotal)}
                </span>
              </div>

              {accessoriesTotal > 0 ? (
                <div className="mt-1 flex justify-between gap-4 lg:justify-end">
                  <span>Accessories</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(accessoriesTotal)}
                  </span>
                </div>
              ) : null}

              <div className="mt-2 flex justify-between gap-4 lg:justify-end">
                <span>Line total</span>
                <span className="text-lg font-bold text-foreground">
                  {formatPrice(lineTotal)}
                </span>
              </div>
            </div>

            {!isOutOfStock && (
              <div className="w-full sm:w-36">
                <AddToCartButton
                  productId={item.productId}
                  slug={item.slug}
                  name={item.name}
                  price={item.price}
                  image={item.image}
                  stock={currentStock}
                  className="h-10"
                  redirectToCartOnAdd={false}
                  accessories={item.accessories ?? []}
                  variantKey={variantKey}
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}