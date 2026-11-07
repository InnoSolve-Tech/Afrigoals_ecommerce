import type { CatalogProduct } from "@/lib/catalog/types";
import { getCartItemKey, type CartItem } from "@/lib/store/cart-store";

export interface StockInfo {
  productId: string;
  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  currentStock: number;
  isOutOfStock: boolean;
  exceedsStock: boolean;
  availableQuantity: number;
}

export type StockMap = Map<string, StockInfo>;

function normalize(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function findVariantStock(
  product: CatalogProduct,
  item: CartItem,
): number {
  const variants = product.variants ?? [];
  if (!variants.length) return Math.max(0, Number(product.stock) || 0);
  const key = normalize(item.variantKey);
  const size = normalize(item.selectedSize);
  const color = normalize(item.selectedColor);
  // Resolve an exact ID first. A key-only selection must not match row one.
  const exact = key
    ? variants.find((v) => normalize(v._key || v.id) === key)
    : undefined;
  const selected =
    exact ??
    (size || color
      ? variants.find(
          (v) =>
            (!size || normalize(v.size) === size) &&
            (!color || normalize(v.color || v.colour) === color),
        )
      : undefined);
  return Math.max(0, Number(selected?.stock) || 0);
}

export function buildStockMap(
  products: CatalogProduct[],
  items: CartItem[],
): StockMap {
  return new Map(
    items.map((item) => {
      const product = products.find((p) => p._id === item.productId);
      const currentStock = product ? findVariantStock(product, item) : 0;
      return [
        getCartItemKey(item),
        {
          productId: item.productId,
          variantKey: item.variantKey ?? null,
          selectedSize: item.selectedSize ?? null,
          selectedColor: item.selectedColor ?? null,
          currentStock,
          isOutOfStock: currentStock <= 0,
          exceedsStock: item.quantity > currentStock,
          availableQuantity: Math.min(item.quantity, currentStock),
        },
      ];
    }),
  );
}
