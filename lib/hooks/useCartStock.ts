"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog/types";
import type { CartItem } from "@/lib/store/cart-store";
import { buildStockMap, type StockMap } from "@/lib/cart/stock";
export type { StockInfo, StockMap } from "@/lib/cart/stock";

export function useCartStock(items: CartItem[]) {
  const [stockMap, setStockMap] = useState<StockMap>(new Map());
  const [isLoading, setIsLoading] = useState(items.length > 0);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStockMap(new Map());
    setError(null);
    setIsLoading(items.length > 0);
    if (!items.length) return;

    try {
      const response = await fetch("/api/cart/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...new Set(items.map((item) => item.productId))],
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Stock request failed: ${response.status}`);
      const products: unknown = await response.json();
      if (!Array.isArray(products)) throw new Error("Invalid stock response");
      if (!controller.signal.aborted) {
        setStockMap(buildStockMap(products as CatalogProduct[], items));
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        console.error("Failed to verify stock:", cause);
        setError("We couldn't verify stock right now. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [items]);

  useEffect(() => {
    void refetch();
    const refresh = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      activeRequest.current?.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refetch]);

  const hasStockIssues = [...stockMap.values()].some(
    (info) => info.isOutOfStock || info.exceedsStock,
  );
  return { stockMap, isLoading, error, hasStockIssues, refetch };
}
