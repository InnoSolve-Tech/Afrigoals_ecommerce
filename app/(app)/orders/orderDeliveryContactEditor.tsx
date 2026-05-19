"use client";

import { useState, useTransition } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type OrderDeliveryContactEditorProps = {
  orderId: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  deliveryAltPhone?: string;
  deliveryNote?: string;
  editable?: boolean;
};

function cleanPhone(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(value);
}

export function OrderDeliveryContactEditor({
  orderId,
  deliveryContactName,
  deliveryContactPhone,
  deliveryAltPhone,
  deliveryNote,
  editable = true,
}: OrderDeliveryContactEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [contactName, setContactName] = useState(deliveryContactName || "");
  const [contactPhone, setContactPhone] = useState(deliveryContactPhone || "");
  const [altPhone, setAltPhone] = useState(deliveryAltPhone || "");
  const [note, setNote] = useState(deliveryNote || "");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setContactName(deliveryContactName || "");
    setContactPhone(deliveryContactPhone || "");
    setAltPhone(deliveryAltPhone || "");
    setNote(deliveryNote || "");
    setError(null);
  }

  function handleCancel() {
    resetForm();
    setIsEditing(false);
  }

  function handleSave() {
    setError(null);

    const name = contactName.trim();
    const phone = cleanPhone(contactPhone);
    const alternate = cleanPhone(altPhone);
    const deliveryMessage = note.trim();

    if (!name) {
      setError("Receiver name is required.");
      return;
    }

    if (!phone) {
      setError("Receiver phone is required.");
      return;
    }

    if (!isValidPhone(phone)) {
      setError("Receiver phone is invalid.");
      return;
    }

    if (alternate && !isValidPhone(alternate)) {
      setError("Alternative phone is invalid.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/delivery-contact`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryContactName: name,
            deliveryContactPhone: phone,
            deliveryAltPhone: alternate,
            deliveryNote: deliveryMessage,
          }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.error || "Failed to update delivery contact information.";

        setError(message);

        toast.error("Update failed", {
          description: message,
        });

        return;
      }

      toast.success("Delivery contact updated");

      setContactName(data.deliveryContactName || name);
      setContactPhone(data.deliveryContactPhone || phone);
      setAltPhone(data.deliveryAltPhone || alternate);
      setNote(data.deliveryNote || deliveryMessage);
      setIsEditing(false);
    });
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Receiver Contact
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              These details are used by the rider, taxi driver, or bus handler
              during delivery.
            </p>
          </div>

          {editable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Receiver name
            </span>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {contactName || "—"}
            </p>
          </div>

          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Receiver phone
            </span>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {contactPhone || "—"}
            </p>
          </div>

          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Alternative phone
            </span>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {altPhone || "—"}
            </p>
          </div>

          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Delivery note
            </span>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
              {note || "—"}
            </p>
          </div>
        </div>

        {!editable ? (
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Receiver contact can no longer be edited for this order.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Edit Receiver Contact
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Update the person who will receive this delivery.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Receiver name
          </label>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Example: Trevor Simon"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Receiver phone
          </label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Example: 0700000000"
            inputMode="tel"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Alternative phone
          </label>
          <input
            value={altPhone}
            onChange={(e) => setAltPhone(e.target.value)}
            placeholder="Optional"
            inputMode="tel"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Delivery note
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Example: Call before arrival"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          Cancel
        </Button>

        <Button type="button" onClick={handleSave} disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}