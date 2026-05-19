"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartActions, useCartItem } from "@/lib/store/cart-store-provider";
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
}: AddToCartButtonProps) {
  const router = useRouter();
  const { addItem, updateQuantity } = useCartActions();

  /**
   * Important:
   * If the same product can be added with different accessories,
   * useCartItem(productId) is not enough long-term.
   *
   * For now, this keeps your existing cart behavior.
   */
  const cartItem = useCartItem(productId);

  const quantityInCart = cartItem?.quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isAtMax = quantityInCart >= stock;

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
      },
      1,
    );

    toast.success(`Added ${name}`);

    if (redirectToCartOnAdd) {
      router.push("/cart");
    }
  };

  const handleDecrement = () => {
    if (quantityInCart > 0) {
      updateQuantity(productId, quantityInCart - 1);
    }
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
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}