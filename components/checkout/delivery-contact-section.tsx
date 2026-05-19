"use client";

import { formatPrice } from "@/lib/utils";

type DeliveryContactSectionProps = {
  deliveryFee: number;
  deliveryDistanceKm: number;

  contactName: string;
  contactPhone: string;
  altPhone: string;
  note: string;

  onContactNameChange: (value: string) => void;
  onContactPhoneChange: (value: string) => void;
  onAltPhoneChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

export function DeliveryContactSection({
  deliveryFee,
  deliveryDistanceKm,
  contactName,
  contactPhone,
  altPhone,
  note,
  onContactNameChange,
  onContactPhoneChange,
  onAltPhoneChange,
  onNoteChange,
}: DeliveryContactSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Delivery Contact Information
      </h2>

      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Enter the person who will receive the product. This can be you or
        someone else.
      </p>

      <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Distance</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {deliveryDistanceKm.toFixed(2)} km
          </span>
        </div>

        <div className="mt-2 flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">
            Delivery fee
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatPrice(deliveryFee, "ugx")}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Receiver name
          </label>
          <input
            value={contactName}
            onChange={(e) => onContactNameChange(e.target.value)}
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
            value={contactPhone}
            onChange={(e) => onContactPhoneChange(e.target.value)}
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
            value={altPhone}
            onChange={(e) => onAltPhoneChange(e.target.value)}
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
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Example: Call before arrival"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
    </div>
  );
}