// app/checkout/success/SuccessClient.tsx
"use client";

import { ArrowRight, Banknote, CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { clearCheckoutDraft } from "@/lib/checkout/draft";
import { useCartActions } from "@/lib/store/cart-store-provider";

interface SuccessClientProps {
  sessionId: string | null;
  paymentMethod: string;
  orderNumber: string | null;
}

export function SuccessClient({
  sessionId,
  paymentMethod,
  orderNumber,
}: SuccessClientProps) {
  const { clearCart } = useCartActions();

  useEffect(() => {
    clearCart();
    clearCheckoutDraft();
  }, [clearCart]);

  const isCod = paymentMethod === "cod";
  const isMobileMoney = paymentMethod === "mobile_money";
  const displayOrder = orderNumber ?? sessionId ?? "—";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Order Confirmed!
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {isCod
            ? "Your order has been received. A confirmation has been sent to your email."
            : "Thank you for your payment. A confirmation has been sent to your email."}
        </p>
      </div>

      <div className="mt-10 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Order Details
          </h2>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {/* Order Number */}
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Order Number
            </span>
            <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {displayOrder}
            </span>
          </div>

          {/* Payment Method */}
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Payment Method
            </span>
            <div className="flex items-center gap-2">
              {isCod ? (
                <>
                  <Banknote className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Cash on Delivery
                  </span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {isMobileMoney ? "Mobile Money (MTN / Airtel)" : "Pesapal"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Payment Status
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isCod
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {isCod ? "Pay on delivery" : "Paid"}
            </span>
          </div>

          {/* COD notice */}
          {isCod && (
            <div className="px-6 py-4">
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                💡 Please keep your phone available. Our delivery team will
                contact you before arrival. Payment will be collected in cash
                upon delivery.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link href="/orders">
            View Your Orders
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
