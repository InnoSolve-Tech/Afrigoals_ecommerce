"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type {
  ApiProduct,
  ApiProductAccessory,
  ApiProductAccessoryLink,
} from "@/lib/api/types";

type ProductAccessoryAssignmentProps = {
  product: ApiProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AssignmentState = {
  accessoryId: string;
  isRequired: boolean;
  sortOrder: number;
};

export function ProductAccessoryAssignment({
  product,
  open,
  onOpenChange,
}: ProductAccessoryAssignmentProps) {
  const [allAccessories, setAllAccessories] = useState<ApiProductAccessory[]>(
    [],
  );
  const [assignments, setAssignments] = useState<AssignmentState[]>([]);
  const [existingAssignedIds, setExistingAssignedIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productId = product?.id ?? "";
  const productName = product?.name ?? "";

  const selectedIds = useMemo(
    () => new Set(assignments.map((item) => item.accessoryId)),
    [assignments],
  );

  const newSelectedCount = useMemo(() => {
    return assignments.filter((item) => !existingAssignedIds.has(item.accessoryId))
      .length;
  }, [assignments, existingAssignedIds]);

  useEffect(() => {
    if (!open || !productId) return;

    async function load() {
      setLoading(true);
      setError(null);
      setAllAccessories([]);
      setAssignments([]);
      setExistingAssignedIds(new Set());

      try {
        const [accessoriesRes, assignedRes] = await Promise.all([
          fetch("/api/admin/accessories", { cache: "no-store" }),
          fetch(`/api/admin/products/${encodeURIComponent(productId)}/accessories`, {
            cache: "no-store",
          }),
        ]);

        const accessoriesData = await accessoriesRes.json().catch(() => ({}));
        const assignedData = await assignedRes.json().catch(() => ({}));

        if (!accessoriesRes.ok) {
          setError(accessoriesData?.error || "Failed to load accessories.");
          return;
        }

        if (!assignedRes.ok) {
          setError(
            assignedData?.error || "Failed to load assigned product accessories.",
          );
          return;
        }

        const activeAccessories = (accessoriesData as ApiProductAccessory[]).filter(
          (item) => item.isActive,
        );

        const assignedLinks = assignedData as ApiProductAccessoryLink[];

        const assignedStates: AssignmentState[] = assignedLinks.map((link) => ({
          accessoryId: link.accessoryId,
          isRequired: Boolean(link.isRequired),
          sortOrder: Number(link.sortOrder || 0),
        }));

        setAllAccessories(activeAccessories);
        setAssignments(assignedStates);
        setExistingAssignedIds(
          new Set(assignedLinks.map((link) => link.accessoryId)),
        );
      } catch {
        setError("Failed to load accessories.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open, productId]);

  if (!open || !productId) return null;

  function toggleAccessory(accessoryId: string) {
    if (existingAssignedIds.has(accessoryId)) {
      return;
    }

    setAssignments((current) => {
      const exists = current.some((item) => item.accessoryId === accessoryId);

      if (exists) {
        return current.filter((item) => item.accessoryId !== accessoryId);
      }

      return [
        ...current,
        {
          accessoryId,
          isRequired: false,
          sortOrder: current.length + 1,
        },
      ];
    });
  }

  function updateAssignment(
    accessoryId: string,
    patch: Partial<AssignmentState>,
  ) {
    setAssignments((current) =>
      current.map((item) =>
        item.accessoryId === accessoryId ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(productId)}/accessories`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessories: assignments,
          }),
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Failed to save product accessories.");
        return;
      }

      const savedLinks = data as ApiProductAccessoryLink[];

      setAssignments(
        savedLinks.map((link) => ({
          accessoryId: link.accessoryId,
          isRequired: Boolean(link.isRequired),
          sortOrder: Number(link.sortOrder || 0),
        })),
      );

      setExistingAssignedIds(
        new Set(savedLinks.map((link) => link.accessoryId)),
      );

      onOpenChange(false);
    } catch {
      setError("Failed to save product accessories.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-950">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Product accessories
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Select accessories available for {productName || "this product"}.
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

        {error ? (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-500">Loading accessories...</p>
        ) : allAccessories.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No active accessories exist yet. Create accessories first.
          </p>
        ) : (
          <div className="space-y-3">
            {allAccessories.map((accessory) => {
              const alreadyAdded = existingAssignedIds.has(accessory.id);
              const selected = selectedIds.has(accessory.id);
              const assignment = assignments.find(
                (item) => item.accessoryId === accessory.id,
              );

              return (
                <div
                  key={accessory.id}
                  className={`rounded-lg border p-4 ${
                    alreadyAdded
                      ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                      : selected
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected || alreadyAdded}
                        disabled={alreadyAdded}
                        onChange={() => toggleAccessory(accessory.id)}
                        className="mt-1"
                      />

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {accessory.name}
                          </p>

                          {alreadyAdded ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-200">
                              Added
                            </span>
                          ) : selected ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                              Selected
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                              Available
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-zinc-500">
                          {accessory.code} •{" "}
                          {formatPrice(accessory.price, "ugx")}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-1">
                          {accessory.isBranding ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Branding
                            </span>
                          ) : null}

                          {accessory.requiresText ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                              Text required
                            </span>
                          ) : null}

                          {accessory.requiresNumber ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                              Number required
                            </span>
                          ) : null}
                        </div>

                        {accessory.description ? (
                          <p className="mt-1 text-sm text-zinc-500">
                            {accessory.description}
                          </p>
                        ) : null}

                        {alreadyAdded ? (
                          <p className="mt-2 text-xs text-green-700 dark:text-green-300">
                            This accessory is already attached to this product.
                          </p>
                        ) : null}
                      </div>
                    </label>

                    {selected && assignment ? (
                      <div className="grid gap-2 sm:w-56 sm:grid-cols-2">
                        <label className="text-xs text-zinc-500">
                          Sort
                          <input
                            type="number"
                            value={assignment.sortOrder}
                            disabled={alreadyAdded}
                            onChange={(e) =>
                              updateAssignment(accessory.id, {
                                sortOrder: Number(e.target.value),
                              })
                            }
                            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:disabled:bg-zinc-900"
                          />
                        </label>

                        <label className="mt-5 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={assignment.isRequired}
                            disabled={alreadyAdded}
                            onChange={(e) =>
                              updateAssignment(accessory.id, {
                                isRequired: e.target.checked,
                              })
                            }
                          />
                          Required
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {newSelectedCount > 0
              ? `${newSelectedCount} new accessory selected.`
              : "Already-added accessories cannot be selected again."}
          </p>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || newSelectedCount === 0}
            >
              {saving ? "Saving..." : "Save new accessories"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}