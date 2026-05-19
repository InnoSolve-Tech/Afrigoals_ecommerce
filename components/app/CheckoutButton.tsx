"use client";

import { useState, useTransition } from "react";
import { Loader2, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartItems } from "@/lib/store/cart-store-provider";
import { createCheckoutSession } from "@/lib/actions/checkout";
import { createCashOnDeliveryOrder } from "@/lib/actions/create-cash-on-delivery-order";

type PaymentMethod = "pesapal" | "cod";

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

function cleanPhone(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(value);
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

    startTransition(async () => {
      try {
        if (paymentMethod === "cod") {
          const result = await createCashOnDeliveryOrder(items, {
            address: deliveryAddress.trim(),
            lat: deliveryLat,
            lng: deliveryLng,
            fee: deliveryFee,
            distanceKm: deliveryDistanceKm,

            contactName: receiverName,
            contactPhone: receiverPhone,
            altPhone: receiverAltPhone,
            note: receiverNote,
          });

          if (!result.success) {
            const message =
              result.error ||
              "Cash on delivery order could not be created. Please try again.";

            setError(message);

            toast.error("Order Creation Failed", {
              description: message,
            });

            return;
          }

          toast.success("Order placed successfully", {
            description: "Cash on delivery has been selected for this order.",
          });

          if (result.url) {
            window.location.href = result.url;
            return;
          }

          window.location.href = "/checkout/success?paymentMethod=cod";
          return;
        }

        const result = await createCheckoutSession(items, {
          address: deliveryAddress.trim(),
          lat: deliveryLat,
          lng: deliveryLng,

          contactName: receiverName,
          contactPhone: receiverPhone,
          altPhone: receiverAltPhone,
          note: receiverNote,
        });

        if (!result.success) {
          const message =
            result.error || "Payment initialization failed. Please try again.";

          setError(message);

          toast.error("Pesapal Checkout Error", {
            description: message,
          });

          return;
        }

        if (!result.url) {
          const message = "Payment gateway did not return a redirect URL.";

          setError(message);

          toast.error("Pesapal Error", {
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
              : "Unexpected error while starting payment.";

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
      : "Connecting to Pesapal..."
    : paymentMethod === "cod"
      ? "Place Order (Cash on Delivery)"
      : "Pay with Pesapal";

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
          : "Secure payment via Pesapal • Mobile Money • Visa • Mastercard"}
      </p>
    </div>
  );
}