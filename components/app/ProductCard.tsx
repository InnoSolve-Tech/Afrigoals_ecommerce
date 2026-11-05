"use client";

import { ShoppingBag, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CatalogProduct } from "@/lib/catalog/types";
import { cn, formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: CatalogProduct;
}

function getDiscountPercent(price: number, compareAtPrice?: number | null) {
  if (
    typeof compareAtPrice !== "number" ||
    compareAtPrice <= 0 ||
    compareAtPrice <= price
  ) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function ProductCard({ product }: ProductCardProps) {
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(
    null,
  );

  const images = product.images ?? [];
  const mainImageUrl = images[0];
  const displayedImageUrl =
    hoveredImageIndex !== null ? images[hoveredImageIndex] : mainImageUrl;

  const stock = product.stock ?? 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const href = product.slug ? `/products/${product.slug}` : "/products";

  const price = product.price ?? 0;

  const compareAtPrice =
    "compareAtPrice" in product
      ? (product.compareAtPrice as number | null | undefined)
      : undefined;

  const soldCount =
    "soldCount" in product
      ? (product.soldCount as number | null | undefined)
      : undefined;

  const discountPercent = getDiscountPercent(price, compareAtPrice);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:border-primary/30 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
          {displayedImageUrl ? (
            <Image
              src={displayedImageUrl}
              alt={product.name ?? "Product image"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <svg
                className="h-16 w-16 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {discountPercent !== null && (
            <span className="absolute right-0 top-3 rounded-l-md bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-md">
              -{discountPercent}%
            </span>
          )}

          {isOutOfStock ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm dark:bg-red-900/40 dark:text-red-200">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm dark:bg-orange-900/40 dark:text-orange-300">
              Only {stock} left
            </span>
          ) : null}

          {product.category && (
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm dark:bg-gray-900/90">
              {product.category.title}
            </span>
          )}
        </div>
      </Link>

      {images.length > 1 && (
        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/70">
          {images.map((imageUrl, index) => (
            <button
              key={imageUrl ?? index}
              type="button"
              className={cn(
                "relative h-14 flex-1 overflow-hidden rounded-lg transition-all duration-200",
                hoveredImageIndex === index
                  ? "ring-2 ring-primary ring-offset-2 dark:ring-primary dark:ring-offset-gray-900"
                  : "opacity-50 hover:opacity-100",
              )}
              onMouseEnter={() => setHoveredImageIndex(index)}
              onMouseLeave={() => setHoveredImageIndex(null)}
            >
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={`${product.name} - view ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="100px"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex grow flex-col justify-between gap-3 p-4">
        <Link href={href} className="block">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="ml-1 text-sm font-medium text-foreground">
                4.8
              </span>
            </div>
            {typeof soldCount === "number" && soldCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {soldCount} sold
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-lg font-bold text-primary">
              {formatPrice(price, product.currency)}
            </p>

            {discountPercent !== null && compareAtPrice != null && (
              <p className="text-xs text-gray-500 line-through dark:text-gray-400">
                {formatPrice(compareAtPrice, product.currency)}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            {product.category?.title ?? "Sports gear"}
          </p>
        </div>
      </div>

      <div className="mt-auto p-4 pt-0">
        {isOutOfStock ? (
          <Button
            disabled
            variant="secondary"
            className="h-11 w-full rounded-lg font-semibold"
          >
            Out of Stock
          </Button>
        ) : (
          <Button
            asChild
            className="h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Link href={href}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Choose options
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
