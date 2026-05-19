import type { ApiOrderItemAccessory } from "@/lib/api/types";

export function parseOrderItemAccessories(
  raw?: string | null,
): ApiOrderItemAccessory[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        accessoryId: String(item.accessoryId || item.AccessoryID || ""),
        code: String(item.code || item.Code || ""),
        name: String(item.name || item.Name || ""),
        quantity: Number(item.quantity || item.Quantity || 1),
        unitPrice: Number(item.unitPrice || item.UnitPrice || 0),
        total: Number(item.total || item.Total || 0),
        text: item.text || item.Text || "",
        number: item.number || item.Number || "",
        notes: item.notes || item.Notes || "",
      }))
      .filter((item) => item.accessoryId || item.name);
  } catch {
    return [];
  }
}