"use client";

import { AlertTriangle, ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckoutButton } from "@/components/app/CheckoutButton";
import { DeliveryMapPicker } from "@/components/checkout/DeliveryMapPicker";
import { GoogleMapsScript } from "@/components/checkout/google-maps-script";
import { Button } from "@/components/ui/button";
import { getDeliveryQuote } from "@/lib/actions/delivery";
import { useCartStock } from "@/lib/hooks/useCartStock";
import {
  useCartItems,
  useTotalItems,
  useTotalPrice,
} from "@/lib/store/cart-store-provider";
import type { CartItem as CartItemType } from "@/lib/store/cart-store";
import { formatPrice } from "@/lib/utils";

type PaymentMethod = "pesapal" | "cod";

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

export function CheckoutClient() {
  const rawItems = useCartItems();
  const productSubtotal = useTotalPrice();
  const totalItems = useTotalItems();

  const [accessoryLookup, setAccessoryLookup] = useState<
    Record<string, Record<string, ProductAccessoryLinkResponse>>
  >({});
  const [isLoadingAccessories, setIsLoadingAccessories] = useState(false);

  const items = useMemo(
    () => enrichCartItemsWithAccessoryPrices(rawItems, accessoryLookup),
    [rawItems, accessoryLookup],
  );

  const accessoriesTotal = getCartAccessoriesTotal(items);
  const subtotal = productSubtotal + accessoriesTotal;

  const { stockMap, isLoading, hasStockIssues } = useCartStock(rawItems);

  const [isCalculating, startTransition] = useTransition();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pesapal");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(
    null,
  );
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const [deliveryContactName, setDeliveryContactName] = useState("");
  const [deliveryContactPhone, setDeliveryContactPhone] = useState("");
  const [deliveryAltPhone, setDeliveryAltPhone] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");

  const total = subtotal + (deliveryFee ?? 0);

  const deliveryQuoteReady =
    deliveryAddress.trim() !== "" &&
    deliveryLat !== null &&
    deliveryLng !== null &&
    deliveryFee !== null &&
    deliveryDistanceKm !== null;

  const deliveryContactReady =
    deliveryContactName.trim() !== "" && deliveryContactPhone.trim() !== "";

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

  function resetDeliveryQuoteAndContact() {
    setDeliveryFee(null);
    setDeliveryDistanceKm(null);
    setDeliveryContactName("");
    setDeliveryContactPhone("");
    setDeliveryAltPhone("");
    setDeliveryNote("");
  }

  const handleAddressSelect = ({
    address,
    lat,
    lng,
  }: {
    address: string;
    lat: number;
    lng: number;
  }) => {
    setDeliveryAddress(address);
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setDeliveryError(null);
    resetDeliveryQuoteAndContact();

    startTransition(async () => {
      const result = await getDeliveryQuote({ lat, lng });

      if (!result.success) {
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        setDeliveryError(result.error || "Failed to calculate delivery");

        toast.error("Delivery Error", {
          description: result.error || "Failed to calculate delivery",
        });

        return;
      }

      if (typeof result.fee !== "number") {
        setDeliveryError("Invalid delivery fee returned.");
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        return;
      }

      if (typeof result.distanceKm !== "number") {
        setDeliveryError("Invalid delivery distance returned.");
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        return;
      }

      setDeliveryFee(result.fee);
      setDeliveryDistanceKm(result.distanceKm);
    });
  };

  const isCheckoutDisabled =
    hasStockIssues ||
    isLoading ||
    isLoadingAccessories ||
    isCalculating ||
    !deliveryQuoteReady ||
    !deliveryContactReady;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-zinc-300 dark:text-zinc-600" />
          <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Your cart is empty
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Add some items to your cart before checking out.
          </p>
          <Button asChild className="mt-8">
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <GoogleMapsScript />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Checkout
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Delivery Details
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Search for the address, click on the map, or drag the pin to the
                exact delivery location.
              </p>

              <div className="mt-4 space-y-4">
                <DeliveryMapPicker onSelect={handleAddressSelect} />

                {deliveryAddress ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      Selected address
                    </p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      {deliveryAddress}
                    </p>
                  </div>
                ) : null}

                {isCalculating ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculating delivery...</span>
                  </div>
                ) : null}

                {deliveryDistanceKm !== null ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Distance: {deliveryDistanceKm.toFixed(1)} km
                  </p>
                ) : null}

                {deliveryFee !== null ? (
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Delivery: {formatPrice(deliveryFee)}
                  </p>
                ) : null}

                {deliveryError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {deliveryError}
                  </p>
                ) : null}
              </div>
            </div>

            {deliveryQuoteReady ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Receiver Contact Information
                </h2>

                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Add the person who will receive the product. This can be you
                  or someone else.
                </p>

                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Delivery distance
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {deliveryDistanceKm.toFixed(1)} km
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between gap-4">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Delivery fee
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatPrice(deliveryFee)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Receiver name
                    </label>
                    <input
                      value={deliveryContactName}
                      onChange={(e) => setDeliveryContactName(e.target.value)}
                      placeholder="Example: Trevor Simon"
                      autoComplete="name"
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Receiver phone
                    </label>
                    <input
                      value={deliveryContactPhone}
                      onChange={(e) => setDeliveryContactPhone(e.target.value)}
                      placeholder="Example: 0700000000"
                      inputMode="tel"
                      autoComplete="tel"
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Alternative phone
                    </label>
                    <input
                      value={deliveryAltPhone}
                      onChange={(e) => setDeliveryAltPhone(e.target.value)}
                      placeholder="Optional"
                      inputMode="tel"
                      autoComplete="tel"
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Delivery note
                    </label>
                    <input
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Example: Call before arrival"
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                {!deliveryContactReady ? (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                    Receiver name and receiver phone are required before
                    checkout.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Payment Method
              </h2>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Choose how the customer will pay for this order.
              </p>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pesapal")}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    paymentMethod === "pesapal"
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        Pay online with Pesapal
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Mobile Money, Visa, Mastercard and other supported
                        payment methods.
                      </p>
                    </div>

                    <div
                      className={`mt-1 h-4 w-4 rounded-full border ${
                        paymentMethod === "pesapal"
                          ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                          : "border-zinc-400"
                      }`}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    paymentMethod === "cod"
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        Cash on Delivery
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Customer pays when the order is delivered.
                      </p>
                    </div>

                    <div
                      className={`mt-1 h-4 w-4 rounded-full border ${
                        paymentMethod === "cod"
                          ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                          : "border-zinc-400"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Order Summary ({totalItems} items)
                </h2>
              </div>

              {hasStockIssues && !isLoading ? (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>
                    Some items have stock issues. Please update your cart before
                    proceeding.
                  </span>
                </div>
              ) : null}

              {(isLoading || isLoadingAccessories) ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  <span className="ml-2 text-sm text-zinc-500">
                    {isLoadingAccessories
                      ? "Loading accessory pricing..."
                      : "Verifying stock..."}
                  </span>
                </div>
              ) : null}

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((item) => {
                  const stockInfo = stockMap.get(item.productId);
                  const hasIssue =
                    stockInfo?.isOutOfStock || stockInfo?.exceedsStock;

                  const itemBaseTotal = item.price * item.quantity;
                  const itemAccessoriesTotal = getItemAccessoriesTotal(item);
                  const itemLineTotal = itemBaseTotal + itemAccessoriesTotal;

                  return (
                    <div
                      key={item.productId}
                      className={`flex gap-4 px-6 py-4 ${
                        hasIssue ? "bg-red-50 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
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

                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                            {item.name}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Qty: {item.quantity}
                          </p>

                          {item.accessories?.length ? (
                            <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                Accessories / customization
                              </p>

                              <div className="mt-1 space-y-1">
                                {item.accessories.map((accessory) => {
                                  const unitPrice =
                                    getAccessoryUnitPrice(accessory);
                                  const accessoryQty =
                                    getAccessoryQuantity(accessory);
                                  const line =
                                    unitPrice * accessoryQty * item.quantity;

                                  return (
                                    <div
                                      key={`${accessory.accessoryId}-${accessory.text || ""}-${accessory.number || ""}`}
                                      className="flex justify-between gap-3 text-zinc-600 dark:text-zinc-400"
                                    >
                                      <span>
                                        {accessory.name ||
                                          accessory.code ||
                                          "Accessory"}
                                        {accessory.text
                                          ? ` • ${accessory.text}`
                                          : ""}
                                        {accessory.number
                                          ? ` #${accessory.number}`
                                          : ""}
                                      </span>

                                      <span>
                                        {unitPrice > 0
                                          ? formatPrice(line)
                                          : "Loading price"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {stockInfo?.isOutOfStock ? (
                            <p className="mt-1 text-sm font-medium text-red-600">
                              Out of stock
                            </p>
                          ) : null}

                          {stockInfo?.exceedsStock &&
                          !stockInfo.isOutOfStock ? (
                            <p className="mt-1 text-sm font-medium text-amber-600">
                              Only {stockInfo.currentStock} available
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatPrice(itemLineTotal)}
                        </p>

                        {itemAccessoriesTotal > 0 ? (
                          <p className="text-sm text-zinc-500">
                            Includes {formatPrice(itemAccessoriesTotal)} extras
                          </p>
                        ) : item.quantity > 1 ? (
                          <p className="text-sm text-zinc-500">
                            {formatPrice(item.price)} each
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Payment Summary
              </h2>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Products
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatPrice(productSubtotal)}
                  </span>
                </div>

                {accessoriesTotal > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Accessories / customization
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {formatPrice(accessoriesTotal)}
                    </span>
                  </div>
                ) : isLoadingAccessories ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Accessories / customization
                    </span>
                    <span className="inline-flex items-center gap-1 text-zinc-900 dark:text-zinc-100">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Subtotal
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Shipping
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {deliveryFee !== null
                      ? formatPrice(deliveryFee)
                      : "Select address"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Payment
                  </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {paymentMethod === "pesapal"
                      ? "Pesapal"
                      : "Cash on Delivery"}
                  </span>
                </div>

                {deliveryQuoteReady ? (
                  <div className="rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      Receiver
                    </p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      {deliveryContactName || "Receiver name required"}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {deliveryContactPhone || "Receiver phone required"}
                    </p>
                  </div>
                ) : null}

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <div className="flex justify-between text-base font-semibold">
                    <span className="text-zinc-900 dark:text-zinc-100">
                      Total
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <CheckoutButton
                  disabled={isCheckoutDisabled}
                  paymentMethod={paymentMethod}
                  deliveryAddress={deliveryAddress}
                  deliveryLat={deliveryLat}
                  deliveryLng={deliveryLng}
                  deliveryFee={deliveryFee}
                  deliveryDistanceKm={deliveryDistanceKm}
                  deliveryContactName={deliveryContactName}
                  deliveryContactPhone={deliveryContactPhone}
                  deliveryAltPhone={deliveryAltPhone}
                  deliveryNote={deliveryNote}
                />
              </div>

              <p className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                {paymentMethod === "pesapal"
                  ? "You'll be redirected to Pesapal's secure checkout."
                  : "You will pay in cash when your order is delivered."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}