"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { ApiProductAccessory } from "@/lib/api/types";

type AccessoryUpsertDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  accessory: ApiProductAccessory | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

type AccessoryPayload = {
  name: string;
  code: string;
  description: string;
  price: number;
  appliesToCategory: string;
  isBranding: boolean;
  requiresText: boolean;
  requiresNumber: boolean;
  isActive: boolean;
};

const defaultPayload: AccessoryPayload = {
  name: "",
  code: "",
  description: "",
  price: 0,
  appliesToCategory: "general",
  isBranding: false,
  requiresText: false,
  requiresNumber: false,
  isActive: true,
};

function slugifyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function AccessoryUpsertDialog({
  open,
  mode,
  accessory,
  onOpenChange,
  onSaved,
}: AccessoryUpsertDialogProps) {
  const [form, setForm] = useState<AccessoryPayload>(defaultPayload);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && accessory) {
      setForm({
        name: accessory.name || "",
        code: accessory.code || "",
        description: accessory.description || "",
        price: Number(accessory.price || 0),
        appliesToCategory: accessory.appliesToCategory || "general",
        isBranding: Boolean(accessory.isBranding),
        requiresText: Boolean(accessory.requiresText),
        requiresNumber: Boolean(accessory.requiresNumber),
        isActive: Boolean(accessory.isActive),
      });
      setError(null);
      return;
    }

    setForm(defaultPayload);
    setError(null);
  }, [open, mode, accessory]);

  if (!open) return null;

  function update<K extends keyof AccessoryPayload>(
    key: K,
    value: AccessoryPayload[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    setError(null);

    const name = form.name.trim();
    const code = slugifyCode(form.code || form.name);

    if (!name) {
      setError("Accessory name is required.");
      return;
    }

    if (!code) {
      setError("Accessory code is required.");
      return;
    }

    if (!Number.isFinite(form.price) || form.price < 0) {
      setError("Accessory price must be zero or greater.");
      return;
    }

    const payload: AccessoryPayload = {
      ...form,
      name,
      code,
      description: form.description.trim(),
      appliesToCategory: form.appliesToCategory.trim().toLowerCase() || "general",
      price: Number(form.price),
    };

    setSaving(true);

    try {
      const url =
        mode === "edit" && accessory?.id
          ? `/api/admin/accessories/${encodeURIComponent(accessory.id)}`
          : "/api/admin/accessories";

      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Failed to save accessory.");
        return;
      }

      await onSaved();
      onOpenChange(false);
    } catch {
      setError("Failed to save accessory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-950">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {mode === "edit" ? "Edit accessory" : "New accessory"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Accessories are selected by customers during product customization.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-2xl leading-none text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => {
                update("name", e.target.value);

                if (mode === "create") {
                  update("code", slugifyCode(e.target.value));
                }
              }}
              placeholder="Example: Name and number branding"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Code
            </label>
            <input
              value={form.code}
              onChange={(e) => update("code", slugifyCode(e.target.value))}
              placeholder="name_number"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Stable internal code. Example: name_only, badge, socks.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Price
            </label>
            <input
              value={form.price}
              onChange={(e) => update("price", Number(e.target.value))}
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Preview: {formatPrice(Number(form.price || 0), "ugx")}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Applies to category
            </label>
            <select
              value={form.appliesToCategory}
              onChange={(e) => update("appliesToCategory", e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="general">General</option>
              <option value="jersey">Jersey</option>
              <option value="shirt">Shirt</option>
              <option value="boots">Boots</option>
              <option value="training">Training</option>
              <option value="goalkeeper">Goalkeeper</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <select
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) => update("isActive", e.target.value === "active")}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Example: Print player name and number on jersey."
              rows={3}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              checked={form.isBranding}
              onChange={(e) => update("isBranding", e.target.checked)}
              type="checkbox"
            />
            Branding option
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              checked={form.requiresText}
              onChange={(e) => update("requiresText", e.target.checked)}
              type="checkbox"
            />
            Requires text/name
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              checked={form.requiresNumber}
              onChange={(e) => update("requiresNumber", e.target.checked)}
              type="checkbox"
            />
            Requires number
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save changes"
                : "Create accessory"}
          </Button>
        </div>
      </div>
    </div>
  );
}