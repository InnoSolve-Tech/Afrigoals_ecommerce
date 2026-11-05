"use client";

import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

type AttemptStatus =
  | "none"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

type AttemptView = {
  id?: string;
  status: AttemptStatus;
  maskedPhone?: string;
  reason?: string;
};

interface MobileMoneyPayClientProps {
  orderId: string;
  orderNumber: string;
  total: number;
  currency: string;
  initialPhone: string;
}

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

function isInFlight(status: AttemptStatus) {
  return status === "pending" || status === "processing";
}

export function MobileMoneyPayClient({
  orderId,
  orderNumber,
  total,
  currency,
  initialPhone,
}: MobileMoneyPayClientProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [attempt, setAttempt] = useState<AttemptView>({ status: "none" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const pollStartedAt = useRef<number | null>(null);
  const succeededHandled = useRef(false);

  const applyAttempt = useCallback(
    (next: AttemptView) => {
      setAttempt(next);

      if (next.status === "succeeded" && !succeededHandled.current) {
        succeededHandled.current = true;
        router.replace(
          `/checkout/success?paymentMethod=mobile_money&orderNumber=${encodeURIComponent(orderNumber)}`,
        );
      }
    },
    [orderNumber, router],
  );

  const fetchStatus = useCallback(async () => {
    const res = await fetch(
      `/api/orders/${encodeURIComponent(orderId)}/payments/mobile-money`,
      {
        cache: "no-store",
      },
    );
    const data = (await res.json().catch(() => ({}))) as AttemptView & {
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || "Could not check payment status.");
    }
    return data;
  }, [orderId]);

  // Initial load: resume an in-flight payment after a refresh or a lost connection.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchStatus();
        if (!cancelled) applyAttempt(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load payment.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchStatus, applyAttempt]);

  // Poll the server while a collection is awaiting approval. The server re-checks
  // with ioTec, so the browser never decides that a payment succeeded.
  useEffect(() => {
    if (!isInFlight(attempt.status)) {
      pollStartedAt.current = null;
      return;
    }

    if (pollStartedAt.current === null) {
      pollStartedAt.current = Date.now();
    }

    const timer = setInterval(async () => {
      if (
        pollStartedAt.current !== null &&
        Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS
      ) {
        setTimedOut(true);
        clearInterval(timer);
        return;
      }
      try {
        applyAttempt(await fetchStatus());
      } catch {
        // Keep polling; a transient error should not end the wait.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [attempt.status, applyAttempt, fetchStatus]);

  async function handlePayNow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setTimedOut(false);

    const cleaned = phone.trim();
    if (!cleaned) {
      setError("Enter the mobile money number that will pay.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/payments/mobile-money`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleaned }),
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => ({}))) as AttemptView & {
        error?: string;
      };

      if (!res.ok) {
        setError(
          data.error || "Could not start the payment. Please try again.",
        );
        return;
      }

      applyAttempt(data);
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const amountLabel = formatPrice(total, currency);

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading payment…
      </div>
    );
  }

  if (attempt.status === "succeeded") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Payment received
        </p>
        <p className="text-sm text-zinc-500">
          Redirecting to your confirmation…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Pay with Mobile Money
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Order {orderNumber}</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Amount to pay</p>
        <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {amountLabel}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          The amount is calculated by Afrigoals from your order.
        </p>
      </div>

      {isInFlight(attempt.status) ? (
        <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-amber-700 dark:text-amber-300" />
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Payment request sent. Approve the prompt on your phone.
            </p>
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {attempt.maskedPhone ? `Sent to ${attempt.maskedPhone}. ` : ""}
            Waiting for confirmation. Your order is not paid until the payment
            is confirmed.
          </p>
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Awaiting approval…
          </div>
          {timedOut ? (
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Still waiting. You can close this page; we will update your order
              when the payment is confirmed. Check{" "}
              <a className="underline" href="/orders">
                your orders
              </a>{" "}
              for the latest status.
            </p>
          ) : null}
        </div>
      ) : null}

      {attempt.status === "failed" || attempt.status === "cancelled" ? (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/40">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <p className="font-semibold text-red-900 dark:text-red-100">
              {attempt.status === "cancelled"
                ? "Payment was cancelled"
                : "Payment did not go through"}
            </p>
          </div>
          {attempt.reason ? (
            <p className="text-sm text-red-800 dark:text-red-200">
              {attempt.reason}
            </p>
          ) : null}
          <p className="text-sm text-red-800 dark:text-red-200">
            No money was taken. You can try again below.
          </p>
        </div>
      ) : null}

      {!isInFlight(attempt.status) ? (
        <form onSubmit={handlePayNow} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="mm-phone"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              MTN or Airtel mobile money number
            </label>
            <Input
              id="mm-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-zinc-500">
              Use the Ugandan number that will approve the payment, for example
              0771234567.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending request…
              </>
            ) : attempt.status === "none" ? (
              `Pay ${amountLabel} now`
            ) : (
              "Try again"
            )}
          </Button>
        </form>
      ) : null}

      {error && isInFlight(attempt.status) ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
