"use client";

import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createCashOnDeliveryOrder } from "@/lib/actions/create-cash-on-delivery-order";
import type { CartItem } from "@/lib/store/cart-store";
import { useCartItems } from "@/lib/store/cart-store-provider";

type PaymentMethod = "cod" | "mobile_money";

interface CheckoutButtonProps {
  disabled?: boolean;
  paymentMethod: PaymentMethod;

  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryFee: number | null;
  deliveryDistanceKm: number | null;

  deliveryContactName: string;
  deliveryContactPhone: string;
  deliveryAltPhone?: string;
  deliveryNote?: string;
}

type CheckoutPayloadItem = CartItem & {
  size?: string | null;
  color?: string | null;
  colour?: string | null;
  variant?: {
    key?: string | null;
    size?: string | null;
    color?: string | null;
    colour?: string | null;
  };
};

function cleanPhone(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(value);
}

function cleanText(value?: string | null) {
  const cleaned = String(value || "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function prepareCheckoutItems(items: CartItem[]): CheckoutPayloadItem[] {
  return items.map((item) => {
    const variantKey = cleanText(item.variantKey);
    const selectedSize = cleanText(item.selectedSize);
    const selectedColor = cleanText(item.selectedColor);

    return {
      ...item,

      variantKey,
      selectedSize,
      selectedColor,

      // Compatibility aliases for backend DTOs.
      size: selectedSize,
      color: selectedColor,
      colour: selectedColor,

      variant: {
        key: variantKey,
        size: selectedSize,
        color: selectedColor,
        colour: selectedColor,
      },
    };
  });
}

export function CheckoutButton({
  disabled,
  paymentMethod,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  deliveryFee,
  deliveryDistanceKm,
  deliveryContactName,
  deliveryContactPhone,
  deliveryAltPhone,
  deliveryNote,
}: CheckoutButtonProps) {
  const items = useCartItems();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const receiverName = deliveryContactName.trim();
  const receiverPhone = cleanPhone(deliveryContactPhone);
  const receiverAltPhone = cleanPhone(deliveryAltPhone);
  const receiverNote = deliveryNote?.trim() || "";

  const hasValidDelivery =
    !!deliveryAddress.trim() &&
    deliveryLat !== null &&
    deliveryLng !== null &&
    deliveryFee !== null &&
    deliveryDistanceKm !== null;

  const hasValidReceiver =
    !!receiverName &&
    !!receiverPhone &&
    isValidPhone(receiverPhone) &&
    (!receiverAltPhone || isValidPhone(receiverAltPhone));

  const canCheckout =
    !disabled &&
    !isPending &&
    items.length > 0 &&
    hasValidDelivery &&
    hasValidReceiver;

  function validateBeforeCheckout(): string | null {
    if (!items.length) return "Your cart is empty.";

    if (!deliveryAddress.trim()) return "Select a delivery address first.";

    if (deliveryLat === null || deliveryLng === null) {
      return "Delivery coordinates are missing.";
    }

    if (deliveryFee === null || deliveryDistanceKm === null) {
      return "Delivery fee has not been calculated.";
    }

    if (!receiverName) return "Receiver name is required.";

    if (!receiverPhone) return "Receiver phone is required.";

    if (!isValidPhone(receiverPhone)) {
      return "Receiver phone is invalid.";
    }

    if (receiverAltPhone && !isValidPhone(receiverAltPhone)) {
      return "Alternative phone is invalid.";
    }

    return null;
  }

  function handleCheckout() {
    const validationError = validateBeforeCheckout();

    if (validationError) {
      setError(validationError);
      toast.error("Checkout blocked", {
        description: validationError,
      });
      return;
    }

    if (!canCheckout) return;

    setError(null);

    const checkoutItems = prepareCheckoutItems(items);

    console.log(
      "FRONTEND CHECKOUT ITEMS",
      JSON.stringify(checkoutItems, null, 2),
    );

    startTransition(async () => {
      try {
        // Mobile money creates a pending order, then sends the customer to the
        // IOTEC payment page. The server confirms payment before marking it paid.
        const result = await createCashOnDeliveryOrder(
          checkoutItems,
          {
            address: deliveryAddress.trim(),
            lat: deliveryLat,
            lng: deliveryLng,
            fee: deliveryFee,
            distanceKm: deliveryDistanceKm,

            contactName: receiverName,
            contactPhone: receiverPhone,
            altPhone: receiverAltPhone,
            note: receiverNote,
          },
          paymentMethod,
        );

        if (!result.success) {
          if (result.url) {
            window.location.href = result.url;
            return;
          }

          const message =
            result.error || "Order could not be created. Please try again.";

          setError(message);

          toast.error(
            paymentMethod === "cod"
              ? "Order Creation Failed"
              : "IOTEC Payment Error",
            {
              description: message,
            },
          );

          return;
        }

        if (!result.url) {
          const message = "Order was created, but no next step was returned.";

          setError(message);

          toast.error("Checkout Error", {
            description: message,
          });

          return;
        }

        window.location.href = result.url;
      } catch (err: unknown) {
        console.error("Checkout error:", err);

        const message =
          err instanceof Error
            ? err.message
            : paymentMethod === "cod"
              ? "Unexpected error while creating the cash on delivery order."
              : "Unexpected error while starting IOTEC mobile money payment.";

        setError(message);

        toast.error(
          paymentMethod === "cod" ? "Order Failed" : "Checkout Failed",
          {
            description: message,
          },
        );
      }
    });
  }

  const buttonLabel = isPending
    ? paymentMethod === "cod"
      ? "Placing order..."
      : paymentMethod === "mobile_money"
        ? "Starting IOTEC payment..."
        : "Placing order..."
    : paymentMethod === "cod"
      ? "Place Order (Cash on Delivery)"
      : paymentMethod === "mobile_money"
        ? "Pay with IOTEC"
        : "Place Order (Cash on Delivery)";

  return (
    <div className="space-y-3">
      <Button
        onClick={handleCheckout}
        disabled={!canCheckout}
        size="lg"
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {buttonLabel}
          </>
        ) : (
          <>
            {paymentMethod === "cod" ? (
              <Banknote className="mr-2 h-5 w-5" />
            ) : (
              <CreditCard className="mr-2 h-5 w-5" />
            )}
            {buttonLabel}
          </>
        )}
      </Button>

      {error ? (
        <div className="text-center text-sm text-red-600 dark:text-red-400">
          <p className="font-medium">
            {paymentMethod === "cod"
              ? "Order could not be created"
              : "Payment could not be started"}
          </p>
          <p>{error}</p>
        </div>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        {paymentMethod === "cod"
          ? "Pay in cash when the order is delivered"
          : paymentMethod === "mobile_money"
            ? "Secure IOTEC payment via MTN or Airtel Mobile Money"
            : "Pay in cash when the order is delivered"}
      </p>
    </div>
  );
}
