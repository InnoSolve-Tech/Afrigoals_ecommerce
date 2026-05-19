"use client";

import {
  AlertTriangle,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartItem } from "@/components/app/CartItem";
import { ProductGrid } from "@/components/app/ProductGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartRecommendations } from "@/lib/hooks/useCartRecommendations";
import { useCartStock } from "@/lib/hooks/useCartStock";
import {
  useCartItems,
  useTotalItems,
  useTotalPrice,
} from "@/lib/store/cart-store-provider";
import type { CartItem as CartItemType } from "@/lib/store/cart-store";
import { formatPrice } from "@/lib/utils";

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

type ProductAccessoryLinkResponse = {
  id: string;
  productId: string;
  accessoryId: string;
  isRequired?: boolean;
  sortOrder?: number;
  accessory?: {
    id: string;
    name: string;
    code: string;
    price: number;
    isActive?: boolean;
  };
};

function getAccessoryUnitPrice(accessory: CartAccessoryLike) {
  return Number(accessory.unitPrice ?? accessory.price ?? 0);
}

function getAccessoryQuantity(accessory: CartAccessoryLike) {
  const quantity = Number(accessory.quantity || 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getItemAccessoriesTotal(item: {
  quantity: number;
  accessories?: CartAccessoryLike[];
}) {
  const perProductAccessoriesTotal =
    item.accessories?.reduce((sum, accessory) => {
      const accessoryQty = getAccessoryQuantity(accessory);
      return sum + getAccessoryUnitPrice(accessory) * accessoryQty;
    }, 0) ?? 0;

  return perProductAccessoriesTotal * Number(item.quantity || 1);
}

function getCartAccessoriesTotal(
  items: Array<{
    quantity: number;
    accessories?: CartAccessoryLike[];
  }>,
) {
  return items.reduce((sum, item) => sum + getItemAccessoriesTotal(item), 0);
}

function enrichCartItemsWithAccessoryPrices(
  items: CartItemType[],
  accessoryLookup: Record<string, Record<string, ProductAccessoryLinkResponse>>,
): CartItemType[] {
  return items.map((item) => {
    if (!Array.isArray(item.accessories) || item.accessories.length === 0) {
      return item;
    }

    const productAccessories = accessoryLookup[item.productId] || {};

    return {
      ...item,
      accessories: item.accessories.map((accessory) => {
        const link = productAccessories[accessory.accessoryId];
        const linkedAccessory = link?.accessory;

        return {
          ...accessory,

          // Keep existing values if already stored in cart.
          name: accessory.name || linkedAccessory?.name || "",
          code: accessory.code || linkedAccessory?.code || "",
          unitPrice:
            typeof accessory.unitPrice === "number"
              ? accessory.unitPrice
              : Number(linkedAccessory?.price || 0),
        };
      }),
    };
  });
}

async function fetchProductAccessories(productId: string) {
  const res = await fetch(
    `/api/products/${encodeURIComponent(productId)}/accessories`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? (data as ProductAccessoryLinkResponse[]) : [];
}

export function CartPageClient() {
  const rawItems = useCartItems();
  const totalItems = useTotalItems();
  const productSubtotal = useTotalPrice();

  const [accessoryLookup, setAccessoryLookup] = useState<
    Record<string, Record<string, ProductAccessoryLinkResponse>>
  >({});
  const [isLoadingAccessories, setIsLoadingAccessories] = useState(false);

  const items = useMemo(
    () => enrichCartItemsWithAccessoryPrices(rawItems, accessoryLookup),
    [rawItems, accessoryLookup],
  );

  const accessoriesTotal = getCartAccessoriesTotal(items);
  const cartSubtotal = productSubtotal + accessoriesTotal;

  const { stockMap, isLoading, hasStockIssues } = useCartStock(rawItems);
  const { products: recommendedProducts, isLoading: isLoadingRecommendations } =
    useCartRecommendations(rawItems);

  useEffect(() => {
    const productIdsNeedingAccessories = Array.from(
      new Set(
        rawItems
          .filter((item) => item.accessories && item.accessories.length > 0)
          .map((item) => item.productId),
      ),
    ).filter((productId) => !accessoryLookup[productId]);

    if (productIdsNeedingAccessories.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadAccessories() {
      setIsLoadingAccessories(true);

      try {
        const results = await Promise.all(
          productIdsNeedingAccessories.map(async (productId) => {
            const links = await fetchProductAccessories(productId);

            const byAccessoryId = links.reduce<
              Record<string, ProductAccessoryLinkResponse>
            >((acc, link) => {
              if (link.accessoryId) {
                acc[link.accessoryId] = link;
              }

              if (link.accessory?.id) {
                acc[link.accessory.id] = link;
              }

              return acc;
            }, {});

            return {
              productId,
              byAccessoryId,
            };
          }),
        );

        if (cancelled) {
          return;
        }

        setAccessoryLookup((current) => {
          const next = { ...current };

          for (const result of results) {
            next[result.productId] = result.byAccessoryId;
          }

          return next;
        });
      } finally {
        if (!cancelled) {
          setIsLoadingAccessories(false);
        }
      }
    }

    loadAccessories();

    return () => {
      cancelled = true;
    };
  }, [rawItems, accessoryLookup]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mx-auto max-w-md text-center">
            <ShoppingBag className="mx-auto mb-6 h-16 w-16 text-gray-400 dark:text-gray-600" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">
              Your basket is empty
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-400">
              Start shopping to add items to your basket.
            </p>
            <Link
              href="/products"
              className="inline-flex rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              Basket
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {totalItems} {totalItems === 1 ? "item" : "items"} ready for
              checkout
              {(isLoading || isLoadingAccessories) ? (
                <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
              ) : null}
            </p>
          </div>

          <Link
            href="/products"
            className="rounded-lg border border-primary px-6 py-2 font-semibold text-primary transition hover:bg-primary/5"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="mb-3 flex items-center gap-3">
              <Truck className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <h2 className="font-semibold text-foreground">Fast delivery</h2>
            </div>
            <p className="text-sm text-blue-900/80 dark:text-blue-100/80">
              Review your basket now and confirm your shipping details at
              checkout.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <h2 className="font-semibold text-foreground">Secure payment</h2>
            </div>
            <p className="text-sm text-emerald-900/80 dark:text-emerald-100/80">
              Your items stay ready in the basket while you head to checkout.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="mb-3 flex items-center gap-3">
              <RefreshCcw className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              <h2 className="font-semibold text-foreground">Easy returns</h2>
            </div>
            <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
              Add the right pieces now, then adjust later if your order needs a
              change.
            </p>
          </div>
        </div>

        {hasStockIssues && !isLoading ? (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Some basket items have stock issues. Please review before checkout.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,380px)]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/40 md:p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Items in your basket
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Confirm quantities, customization, and stock before checkout.
                  </p>
                </div>

                <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    stockInfo={stockMap.get(item.productId)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommended
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Recommended Products
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    A few related picks to help fill out the page and the basket.
                  </p>
                </div>

                {isLoadingRecommendations ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : null}
              </div>

              {recommendedProducts.length > 0 ? (
                <div className="mt-6">
                  <ProductGrid products={recommendedProducts} />
                </div>
              ) : !isLoadingRecommendations ? (
                <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                  Related products will appear here as matching items become
                  available.
                </p>
              ) : null}
            </section>
          </div>

          <aside>
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-6 text-2xl font-bold text-foreground">
                  Order Summary
                </h2>

                <div className="mb-6 flex gap-2">
                  <div className="relative flex-1">
                    <TicketPercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Coupon code"
                      className="rounded-lg bg-white pl-9 dark:bg-gray-900"
                    />
                  </div>
                  <Button className="rounded-lg bg-primary hover:bg-primary/90">
                    Apply
                  </Button>
                </div>

                <div className="mb-6 space-y-3 border-b border-gray-200 pb-6 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Items
                    </span>
                    <span className="font-semibold text-foreground">
                      {totalItems}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Products
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatPrice(productSubtotal)}
                    </span>
                  </div>

                  {accessoriesTotal > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Accessories / customization
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(accessoriesTotal)}
                      </span>
                    </div>
                  ) : isLoadingAccessories ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Accessories / customization
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Subtotal
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatPrice(cartSubtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Delivery
                    </span>
                    <span className="font-semibold text-foreground">
                      At checkout
                    </span>
                  </div>
                </div>

                <div className="mb-6 flex justify-between">
                  <span className="text-lg font-bold text-foreground">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(cartSubtotal)}
                  </span>
                </div>

                {hasStockIssues ? (
                  <Button disabled className="mb-3 w-full rounded-lg py-6">
                    Resolve stock issues to checkout
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="mb-3 w-full rounded-lg bg-primary py-6 text-lg font-bold hover:bg-primary/90"
                  >
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                )}

                <Link
                  href="/products"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
                >
                  Keep Shopping
                </Link>

                <div className="mt-6 space-y-3 border-t border-gray-200 pt-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                  <p className="flex items-center justify-center gap-2">
                    <LockKeyhole className="h-4 w-4" />
                    Secure payment
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery calculated from your checkout address
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-foreground">
                  Before you checkout
                </h3>
                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <p className="flex items-start gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Delivery pricing is calculated once your address is
                    confirmed.
                  </p>
                  <p className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Payments stay protected throughout the checkout flow.
                  </p>
                  <p className="flex items-start gap-2">
                    <RefreshCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Review quantities now so the order feels right before
                    placing it.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}