"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useCartActions,
  useCartItems,
} from "@/lib/store/cart-store-provider";
import type { CartItemAccessory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  className?: string;
  redirectToCartOnAdd?: boolean;

  accessories?: CartItemAccessory[];
  validateBeforeAdd?: () => string | null;

  /**
   * Variant fields.
   * These allow the basket to store the exact size/colour selected.
   */
  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
}

function normalizeVariantValue(value?: string | null) {
  const cleaned = String(value || "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function sameCartLine(
  item: {
    productId: string;
    variantKey?: string | null;
    selectedSize?: string | null;
    selectedColor?: string | null;
  },
  target: {
    productId: string;
    variantKey?: string | null;
    selectedSize?: string | null;
    selectedColor?: string | null;
  },
) {
  return (
    item.productId === target.productId &&
    (item.variantKey || "") === (target.variantKey || "") &&
    (item.selectedSize || "") === (target.selectedSize || "") &&
    (item.selectedColor || "") === (target.selectedColor || "")
  );
}

function getSelectedVariantText(size?: string | null, color?: string | null) {
  const parts = [];

  if (size) {
    parts.push(`Size: ${size}`);
  }

  if (color) {
    parts.push(`Colour: ${color}`);
  }

  return parts.join(" • ");
}

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  image,
  stock,
  className,
  redirectToCartOnAdd = true,
  accessories = [],
  validateBeforeAdd,
  variantKey,
  selectedSize,
  selectedColor,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem, updateQuantity } = useCartActions();
  const cartItems = useCartItems();

  const normalizedVariantKey = normalizeVariantValue(variantKey);
  const normalizedSelectedSize = normalizeVariantValue(selectedSize);
  const normalizedSelectedColor = normalizeVariantValue(selectedColor);

  const selectedCartTarget = useMemo(
    () => ({
      productId,
      variantKey: normalizedVariantKey,
      selectedSize: normalizedSelectedSize,
      selectedColor: normalizedSelectedColor,
    }),
    [
      productId,
      normalizedVariantKey,
      normalizedSelectedSize,
      normalizedSelectedColor,
    ],
  );

  const cartItem = useMemo(
    () =>
      cartItems.find((item) =>
        sameCartLine(item, selectedCartTarget),
      ),
    [cartItems, selectedCartTarget],
  );

  const quantityInCart = cartItem?.quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isAtMax = quantityInCart >= stock;

  const selectedVariantText = getSelectedVariantText(
    normalizedSelectedSize,
    normalizedSelectedColor,
  );

  const handleAdd = () => {
    if (isOutOfStock) {
      toast.error("This product is out of stock.");
      return;
    }

    if (quantityInCart >= stock) {
      toast.error("You have reached the available stock limit.");
      return;
    }

    const validationError = validateBeforeAdd?.() ?? null;

    if (validationError) {
      toast.error(validationError);
      return;
    }

    addItem(
      {
        productId,
        slug,
        name,
        price,
        image,
        accessories,

        variantKey: normalizedVariantKey,
        selectedSize: normalizedSelectedSize,
        selectedColor: normalizedSelectedColor,
      },
      1,
    );

    toast.success(
      selectedVariantText
        ? `Added ${name} — ${selectedVariantText}`
        : `Added ${name}`,
    );

    if (redirectToCartOnAdd) {
      router.push("/cart");
    }
  };

  const handleDecrement = () => {
    if (quantityInCart <= 0) {
      return;
    }

    updateQuantity(
      productId,
      quantityInCart - 1,
      normalizedVariantKey,
      normalizedSelectedSize,
      normalizedSelectedColor,
    );
  };

  if (isOutOfStock) {
    return (
      <Button
        disabled
        variant="secondary"
        className={cn("h-11 w-full rounded-lg font-semibold", className)}
      >
        Out of Stock
      </Button>
    );
  }

  if (quantityInCart === 0) {
    return (
      <Button
        onClick={handleAdd}
        className={cn(
          "h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
          className,
        )}
      >
        <ShoppingBag className="mr-2 h-4 w-4" />
        Add to Basket
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-full items-center rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-full flex-1 rounded-r-none"
        onClick={handleDecrement}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <span className="flex-1 text-center text-sm font-semibold tabular-nums">
        {quantityInCart}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-full flex-1 rounded-l-none disabled:opacity-20"
        onClick={handleAdd}
        disabled={isAtMax}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}