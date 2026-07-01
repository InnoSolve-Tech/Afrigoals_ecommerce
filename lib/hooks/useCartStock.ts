"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog/types";
import {
  getCartItemKey,
  type CartItem,
} from "@/lib/store/cart-store";

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

interface UseCartStockReturn {
  stockMap: StockMap;
  isLoading: boolean;
  hasStockIssues: boolean;
  refetch: () => void;
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function findVariantStock(product: CatalogProduct, item: CartItem) {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length === 0) {
    return Number(product.stock || 0);
  }

  const selectedVariantKey = normalizeText(item.variantKey);
  const selectedSize = normalizeText(item.selectedSize);
  const selectedColor = normalizeText(item.selectedColor);

  const selectedVariant = variants.find((variant) => {
    const variantKey = normalizeText(variant._key || variant.id || "");
    const variantSize = normalizeText(variant.size);
    const variantColor = normalizeText(variant.color || variant.colour);

    if (selectedVariantKey && variantKey === selectedVariantKey) {
      return true;
    }

    const sizeMatches = selectedSize ? variantSize === selectedSize : true;
    const colorMatches = selectedColor ? variantColor === selectedColor : true;

    return sizeMatches && colorMatches;
  });

  return Number(selectedVariant?.stock || 0);
}

/**
 * Fetches current stock levels for cart items.
 * Supports variant-level stock using productId + variantKey + selectedSize + selectedColor.
 */
export function useCartStock(items: CartItem[]): UseCartStockReturn {
  const [stockMap, setStockMap] = useState<StockMap>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const productIds = useMemo(
    () => Array.from(new Set(items.map((item) => item.productId))),
    [items],
  );

  const fetchStock = useCallback(async () => {
    if (items.length === 0) {
      setStockMap(new Map());
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/cart/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: productIds }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stock: ${response.status}`);
      }

      const products = (await response.json()) as CatalogProduct[];

      const newStockMap = new Map<string, StockInfo>();

      for (const item of items) {
        const product = products.find((p) => p._id === item.productId);
        const currentStock = product ? findVariantStock(product, item) : 0;
        const cartItemKey = getCartItemKey(item);

        newStockMap.set(cartItemKey, {
          productId: item.productId,
          variantKey: item.variantKey ?? null,
          selectedSize: item.selectedSize ?? null,
          selectedColor: item.selectedColor ?? null,
          currentStock,
          isOutOfStock: currentStock <= 0,
          exceedsStock: item.quantity > currentStock,
          availableQuantity: Math.min(item.quantity, currentStock),
        });
      }

      setStockMap(newStockMap);
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    } finally {
      setIsLoading(false);
    }
  }, [items, productIds]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const hasStockIssues = Array.from(stockMap.values()).some(
    (info) => info.isOutOfStock || info.exceedsStock,
  );

  return {
    stockMap,
    isLoading,
    hasStockIssues,
    refetch: fetchStock,
  };
}