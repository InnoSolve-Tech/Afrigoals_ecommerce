"use client";

import { MapPin } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type DeliveryQuoteSummaryProps = {
  address: string;
  fee: number;
  distanceKm: number;
};

export function DeliveryQuoteSummary({
  address,
  fee,
  distanceKm,
}: DeliveryQuoteSummaryProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Delivery Quote
        </h2>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Delivery address
          </span>
          <p className="mt-1 text-zinc-900 dark:text-zinc-100">
            {address || "—"}
          </p>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Distance</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {distanceKm.toFixed(2)} km
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">
            Delivery fee
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatPrice(fee, "ugx")}
          </span>
        </div>
      </div>
    </div>
  );
}