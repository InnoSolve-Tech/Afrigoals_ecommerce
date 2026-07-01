"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { AskAISimilarButton } from "@/components/app/AskAISimilarButton";
import { formatPrice } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/types";
import type {
  ApiProductAccessoryLink,
  CartItemAccessory,
} from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface Review {
  _id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

interface ProductInfoProps {
  product: CatalogProduct;
}

type NormalizedProductVariant = {
  _key: string;
  size: string;
  color: string;
  stock: number;
};

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

function normalizeProductVariants(product: CatalogProduct) {
  const rawVariants = Array.isArray(product.variants) ? product.variants : [];

  const variants: NormalizedProductVariant[] = rawVariants
    .map((variant, index) => {
      const size = String(variant.size || "").trim();
      const color = String(variant.color || variant.colour || "").trim();
      const stock = Math.max(0, Number(variant.stock || 0));

      return {
        _key:
          variant._key ||
          variant.id ||
          `${size || "no-size"}-${color || "no-color"}-${index}`,
        size,
        color,
        stock,
      };
    })
    .filter((variant) => variant.size || variant.color);

  if (variants.length > 0) {
    return variants;
  }

  /**
   * Backward compatibility for older products that still use:
   * hasSizes + sizes
   */
  const rawSizes = Array.isArray(product.sizes) ? product.sizes : [];

  return rawSizes
    .map((variant, index) => {
      const size = String(variant.size || "").trim();
      const stock = Math.max(0, Number(variant.stock || 0));

      return {
        _key: variant._key || `${size || "no-size"}-${index}`,
        size,
        color: "",
        stock,
      };
    })
    .filter((variant) => variant.size);
}

function getVariantLabel(variant: Pick<NormalizedProductVariant, "size" | "color">) {
  const label = [variant.size, variant.color].filter(Boolean).join(" / ");

  return label || "Selected variant";
}

function StockIndicator({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
        Only {stock} left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {stock} in stock
    </span>
  );
}

export function ProductInfo({ product }: ProductInfoProps) {
  const imageUrl = product.images?.[0] ?? undefined;

  const compareAtPrice = product.compareAtPrice ?? null;
  const soldCount = product.soldCount ?? null;
  const price = product.price ?? 0;

  const variants = useMemo(() => normalizeProductVariants(product), [product]);
  const hasVariants = variants.length > 0;

  const sizeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .map((variant) => variant.size)
            .filter((size): size is string => Boolean(size)),
        ),
      ),
    [variants],
  );

  const [selectedSize, setSelectedSize] = useState<string | null>(
    sizeOptions[0] ?? null,
  );

  const colorOptionsForSelectedSize = useMemo(
    () =>
      Array.from(
        new Set(
          variants
            .filter((variant) => {
              if (!selectedSize) return true;
              return variant.size === selectedSize;
            })
            .map((variant) => variant.color)
            .filter((color): color is string => Boolean(color)),
        ),
      ),
    [variants, selectedSize],
  );

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colorOptionsForSelectedSize[0] ?? null,
  );

  useEffect(() => {
    if (!hasVariants) {
      setSelectedSize(null);
      setSelectedColor(null);
      return;
    }

    setSelectedSize((current) => {
      if (current && sizeOptions.includes(current)) {
        return current;
      }

      return sizeOptions[0] ?? null;
    });
  }, [hasVariants, sizeOptions]);

  useEffect(() => {
    if (!hasVariants) {
      setSelectedColor(null);
      return;
    }

    setSelectedColor((current) => {
      if (current && colorOptionsForSelectedSize.includes(current)) {
        return current;
      }

      return colorOptionsForSelectedSize[0] ?? null;
    });
  }, [hasVariants, colorOptionsForSelectedSize]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;

    return (
      variants.find((variant) => {
        const sizeMatches = selectedSize ? variant.size === selectedSize : true;
        const colorMatches = selectedColor
          ? variant.color === selectedColor
          : true;

        return sizeMatches && colorMatches;
      }) ?? null
    );
  }, [hasVariants, variants, selectedSize, selectedColor]);

  const totalVariantStock = useMemo(
    () => variants.reduce((total, variant) => total + variant.stock, 0),
    [variants],
  );

  const effectiveStock = hasVariants
    ? selectedVariant?.stock ?? 0
    : Number(product.stock ?? 0);

  const discountPercent = useMemo(
    () => getDiscountPercent(price, compareAtPrice),
    [price, compareAtPrice],
  );

  const hasDiscount =
    typeof compareAtPrice === "number" && compareAtPrice > price;

  const savings =
    hasDiscount && compareAtPrice !== null ? compareAtPrice - price : null;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingReviews, setFetchingReviews] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [accessoryLinks, setAccessoryLinks] = useState<
    ApiProductAccessoryLink[]
  >([]);
  const [fetchingAccessories, setFetchingAccessories] = useState(true);
  const [selectedAccessories, setSelectedAccessories] = useState<
    CartItemAccessory[]
  >([]);
  const [accessoryError, setAccessoryError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setFetchingReviews(true);

      if (!API_BASE_URL) {
        throw new Error("NEXT_PUBLIC_API_URL is missing");
      }

      const res = await fetch(
        `${API_BASE_URL}/reviews?productId=${encodeURIComponent(product._id)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const data = await res.json();
      const fetched: Review[] = data.reviews ?? [];

      setReviews(fetched);
      setAverageRating(
        fetched.length > 0
          ? fetched.reduce((sum, review) => sum + review.rating, 0) /
              fetched.length
          : 0,
      );
    } catch (error) {
      console.error("Fetch reviews failed:", error);
      setReviews([]);
      setAverageRating(0);
    } finally {
      setFetchingReviews(false);
    }
  }, [product._id]);

  const fetchProductAccessories = useCallback(async () => {
    try {
      setFetchingAccessories(true);
      setAccessoryError(null);

      const res = await fetch(
        `/api/products/${encodeURIComponent(product._id)}/accessories`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch product accessories");
      }

      const links = data as ApiProductAccessoryLink[];

      setAccessoryLinks(links);

      const requiredAccessories: CartItemAccessory[] = links
        .filter((link) => link.isRequired && link.accessory?.id)
        .map((link) => ({
          accessoryId: link.accessory.id,
          quantity: 1,
          text: "",
          number: "",
          notes: "",
        }));

      setSelectedAccessories(requiredAccessories);
    } catch (error) {
      console.error("Fetch product accessories failed:", error);
      setAccessoryLinks([]);
      setSelectedAccessories([]);
      setAccessoryError("Failed to load product accessories.");
    } finally {
      setFetchingAccessories(false);
    }
  }, [product._id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchProductAccessories();
  }, [fetchProductAccessories]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitMessage(null);

    if (!reviewName.trim() || !reviewComment.trim()) {
      setSubmitMessage({
        type: "error",
        text: "Please fill in all fields",
      });
      return;
    }

    if (!API_BASE_URL) {
      setSubmitMessage({
        type: "error",
        text: "API URL is missing. Check NEXT_PUBLIC_API_URL.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product._id,
          name: reviewName.trim(),
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error ?? "Failed to submit review");
      }

      setSubmitMessage({
        type: "success",
        text: "Review submitted successfully 🎉",
      });

      setReviewName("");
      setReviewRating(5);
      setReviewComment("");

      await fetchReviews();
    } catch (error) {
      console.error("Submit review failed:", error);

      setSubmitMessage({
        type: "error",
        text: "Failed to submit review. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function renderStars(rating: number) {
    const starKeys = ["star-1", "star-2", "star-3", "star-4", "star-5"];

    return (
      <div className="flex text-yellow-400">
        {starKeys.map((key, i) => (
          <span key={key}>{i < rating ? "★" : "☆"}</span>
        ))}
      </div>
    );
  }

  function isAccessorySelected(accessoryId: string) {
    return selectedAccessories.some((item) => item.accessoryId === accessoryId);
  }

  function getSelectedAccessory(accessoryId: string) {
    return selectedAccessories.find((item) => item.accessoryId === accessoryId);
  }

  function toggleAccessory(accessoryId: string, isRequired: boolean) {
    setSelectedAccessories((current) => {
      const exists = current.some((item) => item.accessoryId === accessoryId);

      if (exists && !isRequired) {
        return current.filter((item) => item.accessoryId !== accessoryId);
      }

      if (exists) {
        return current;
      }

      return [
        ...current,
        {
          accessoryId,
          quantity: 1,
          text: "",
          number: "",
          notes: "",
        },
      ];
    });
  }

  function updateSelectedAccessory(
    accessoryId: string,
    patch: Partial<CartItemAccessory>,
  ) {
    setSelectedAccessories((current) =>
      current.map((item) =>
        item.accessoryId === accessoryId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function validateAccessories(): string | null {
    for (const link of accessoryLinks) {
      const accessory = link.accessory;
      const selected = getSelectedAccessory(accessory.id);

      if (link.isRequired && !selected) {
        return `${accessory.name} is required.`;
      }

      if (!selected) {
        continue;
      }

      if (accessory.requiresText && !selected.text?.trim()) {
        return `${accessory.name} requires text/name.`;
      }

      if (accessory.requiresNumber && !selected.number?.trim()) {
        return `${accessory.name} requires a number.`;
      }
    }

    return null;
  }

  function validateProductSelection(): string | null {
    if (hasVariants && !selectedVariant) {
      return "Please select an available size and colour.";
    }

    if (hasVariants && selectedVariant && selectedVariant.stock <= 0) {
      return `${getVariantLabel(selectedVariant)} is out of stock.`;
    }

    return validateAccessories();
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      {product.category && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link
            href={`/products?category=${product.category.slug}`}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
          >
            {product.category.title}
          </Link>

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Afrigoals Store
          </span>
        </div>
      )}

      <h1 className="text-3xl font-bold text-foreground md:text-4xl">
        {product.name}
      </h1>

      {!fetchingReviews && reviews.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {renderStars(Math.round(averageRating))}

          <span className="text-sm font-semibold text-foreground">
            {averageRating.toFixed(1)}
          </span>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
          </span>
        </div>
      )}

      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-4xl font-bold text-primary">
            {formatPrice(price, product.currency)}
          </p>

          {hasDiscount && compareAtPrice !== null && (
            <>
              <span className="text-lg font-medium text-muted-foreground line-through">
                {formatPrice(compareAtPrice, product.currency)}
              </span>

              {discountPercent !== null && (
                <span className="rounded-md bg-orange-500 px-2.5 py-1 text-sm font-bold text-white shadow-sm">
                  -{discountPercent}%
                </span>
              )}
            </>
          )}
        </div>

        {hasDiscount && savings !== null && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-green-600 dark:text-green-400">
              You save {formatPrice(savings, product.currency)}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <StockIndicator stock={effectiveStock} />

          {hasVariants && (
            <span className="text-sm text-muted-foreground">
              {totalVariantStock} total across {variants.length}{" "}
              {variants.length === 1 ? "variant" : "variants"}
            </span>
          )}

          {typeof soldCount === "number" && soldCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {soldCount} sold
            </span>
          )}
        </div>
      </div>

      {product.description && (
        <div className="mt-8">
          <h2 className="mb-3 font-semibold text-foreground">Description</h2>

          <p className="leading-relaxed text-gray-700 dark:text-gray-300">
            {product.description}
          </p>
        </div>
      )}

      {hasVariants && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Select Variant
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose the size and colour to see the exact stock available.
            </p>
          </div>

          {sizeOptions.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Size</p>

                {selectedSize && (
                  <span className="text-sm text-muted-foreground">
                    Selected:{" "}
                    <span className="font-medium text-foreground">
                      {selectedSize}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => {
                  const sizeTotalStock = variants
                    .filter((variant) => variant.size === size)
                    .reduce((total, variant) => total + variant.stock, 0);

                  const outOfStock = sizeTotalStock <= 0;
                  const isSelected = selectedSize === size;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => {
                        setSelectedSize(size);
                        setSelectedColor(null);
                      }}
                      title={
                        outOfStock
                          ? "Out of stock"
                          : `${sizeTotalStock} available in this size`
                      }
                      className={[
                        "relative rounded-md border px-4 py-2 text-sm font-medium transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:border-primary hover:bg-accent",
                        outOfStock
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      {outOfStock && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="w-full border-t border-current opacity-60" />
                        </span>
                      )}

                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {colorOptionsForSelectedSize.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Colour</p>

                {selectedColor && (
                  <span className="text-sm text-muted-foreground">
                    Selected:{" "}
                    <span className="font-medium text-foreground">
                      {selectedColor}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {colorOptionsForSelectedSize.map((color) => {
                  const matchingVariant = variants.find((variant) => {
                    const sizeMatches = selectedSize
                      ? variant.size === selectedSize
                      : true;

                    return sizeMatches && variant.color === color;
                  });

                  const stock = matchingVariant?.stock ?? 0;
                  const outOfStock = stock <= 0;
                  const isLowStock = stock > 0 && stock <= 5;
                  const isSelected = selectedColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => setSelectedColor(color)}
                      title={
                        outOfStock
                          ? "Out of stock"
                          : isLowStock
                            ? `Only ${stock} left`
                            : `${stock} available`
                      }
                      className={[
                        "relative rounded-md border px-4 py-2 text-sm font-medium transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-foreground hover:border-primary hover:bg-accent",
                        outOfStock
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      {outOfStock && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="w-full border-t border-current opacity-60" />
                        </span>
                      )}

                      {color}

                      {isLowStock && !outOfStock && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-orange-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 min-h-[20px]">
            {selectedVariant ? (
              <p
                className={[
                  "text-sm font-medium",
                  selectedVariant.stock === 0
                    ? "text-red-500"
                    : selectedVariant.stock <= 5
                      ? "text-orange-500"
                      : "text-green-600",
                ].join(" ")}
              >
                {selectedVariant.stock === 0
                  ? `${getVariantLabel(selectedVariant)} is out of stock`
                  : selectedVariant.stock <= 5
                    ? `⚠ Only ${selectedVariant.stock} left for ${getVariantLabel(
                        selectedVariant,
                      )}`
                    : `✓ ${selectedVariant.stock} available for ${getVariantLabel(
                        selectedVariant,
                      )}`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Please select a valid size and colour combination.
              </p>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-3 bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Size</span>
              <span>Colour</span>
              <span className="text-right">Stock</span>
            </div>

            {variants.map((variant) => {
              const isSelected = selectedVariant?._key === variant._key;

              return (
                <button
                  key={variant._key}
                  type="button"
                  disabled={variant.stock <= 0}
                  onClick={() => {
                    setSelectedSize(variant.size || null);
                    setSelectedColor(variant.color || null);
                  }}
                  className={[
                    "grid w-full grid-cols-3 px-3 py-2 text-left text-sm transition",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-background text-foreground hover:bg-accent",
                    variant.stock <= 0
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer",
                  ].join(" ")}
                >
                  <span>{variant.size || "—"}</span>
                  <span>{variant.color || "—"}</span>
                  <span className="text-right font-medium">
                    {variant.stock <= 0 ? "Out" : variant.stock}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {fetchingAccessories ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading product accessories...
        </div>
      ) : accessoryError ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {accessoryError}
        </div>
      ) : accessoryLinks.length > 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-4">
            <h2 className="font-semibold text-foreground">
              Customize your product
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select available accessories, branding, badges, or kit extras for
              this product.
            </p>
          </div>

          <div className="space-y-4">
            {accessoryLinks.map((link) => {
              const accessory = link.accessory;
              const selected = isAccessorySelected(accessory.id);
              const selectedItem = getSelectedAccessory(accessory.id);

              return (
                <div
                  key={link.id}
                  className={`rounded-lg border p-4 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={link.isRequired}
                      onChange={() =>
                        toggleAccessory(accessory.id, link.isRequired)
                      }
                      className="mt-1"
                    />

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {accessory.name}
                        </p>

                        {link.isRequired ? (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                            Required
                          </span>
                        ) : null}

                        {accessory.isBranding ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Branding
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {accessory.code} • {formatPrice(accessory.price, "ugx")}
                      </p>

                      {accessory.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {accessory.description}
                        </p>
                      ) : null}

                      {selected ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={selectedItem?.quantity ?? 1}
                              onChange={(e) =>
                                updateSelectedAccessory(accessory.id, {
                                  quantity: Math.max(
                                    1,
                                    Number(e.target.value) || 1,
                                  ),
                                })
                              }
                              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                            />
                          </div>

                          {accessory.requiresText ? (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                Text / Name
                              </label>
                              <input
                                value={selectedItem?.text ?? ""}
                                onChange={(e) =>
                                  updateSelectedAccessory(accessory.id, {
                                    text: e.target.value,
                                  })
                                }
                                placeholder="Example: TREVOR"
                                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                              />
                            </div>
                          ) : null}

                          {accessory.requiresNumber ? (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                Number
                              </label>
                              <input
                                value={selectedItem?.number ?? ""}
                                onChange={(e) =>
                                  updateSelectedAccessory(accessory.id, {
                                    number: e.target.value,
                                  })
                                }
                                placeholder="Example: 10"
                                inputMode="numeric"
                                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                              />
                            </div>
                          ) : null}

                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Notes
                            </label>
                            <input
                              value={selectedItem?.notes ?? ""}
                              onChange={(e) =>
                                updateSelectedAccessory(accessory.id, {
                                  notes: e.target.value,
                                })
                              }
                              placeholder="Optional"
                              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
       <AddToCartButton
  productId={product._id}
  slug={product.slug ?? undefined}
  name={product.name ?? "Unknown Product"}
  price={price}
  image={imageUrl}
  stock={effectiveStock}
  accessories={selectedAccessories}
  validateBeforeAdd={validateProductSelection}
  redirectToCartOnAdd
  variantKey={selectedVariant?._key ?? null}
  selectedSize={selectedVariant?.size || null}
  selectedColor={selectedVariant?.color || null}
/>

        <AskAISimilarButton productName={product.name ?? "this product"} />
      </div>

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        Fast delivery | Secure checkout | Easy returns
      </div>

      {(product.material ||
        product.color ||
        product.dimensions ||
        product.assemblyRequired ||
        hasVariants) && (
        <div className="mt-6 border-t border-border pt-6">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
            Product Details
          </p>

          <div className="space-y-3">
            {product.material && (
              <div className="flex gap-2 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">
                  Material
                </span>

                <span className="capitalize text-foreground">
                  {product.material}
                </span>
              </div>
            )}

            {product.color && (
              <div className="flex gap-2 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">
                  Base Colour
                </span>

                <span className="capitalize text-foreground">
                  {product.color}
                </span>
              </div>
            )}

            {product.dimensions && (
              <div className="flex gap-2 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">
                  Dimensions
                </span>

                <span className="text-foreground">{product.dimensions}</span>
              </div>
            )}

            {product.assemblyRequired && (
              <div className="flex gap-2 text-sm">
                <span className="w-28 shrink-0 text-muted-foreground">
                  Assembly
                </span>

                <span className="text-foreground">Required</span>
              </div>
            )}

            {hasVariants && (
              <div className="flex items-start gap-2 text-sm">
                <span className="w-28 shrink-0 pt-0.5 text-muted-foreground">
                  Variants
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {variants.map((variant) => {
                    const outOfStock = variant.stock === 0;
                    const isLowStock = variant.stock > 0 && variant.stock <= 5;

                    return (
                      <span
                        key={variant._key}
                        title={
                          outOfStock
                            ? "Out of stock"
                            : isLowStock
                              ? `Only ${variant.stock} left`
                              : `${variant.stock} in stock`
                        }
                        className={[
                          "rounded border px-2 py-0.5 text-xs font-medium",
                          outOfStock
                            ? "border-border text-muted-foreground line-through opacity-50"
                            : isLowStock
                              ? "border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400"
                              : "border-border bg-card text-foreground",
                        ].join(" ")}
                      >
                        {getVariantLabel(variant)} — {variant.stock}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-xl font-semibold text-foreground">
          Customer Reviews
        </h2>

        {!fetchingReviews && (
          <div className="mt-2 flex items-center gap-3">
            {renderStars(Math.round(averageRating))}

            <span className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} / 5 ({reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {fetchingReviews ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews yet. Be the first to review!
            </p>
          ) : (
            reviews.map((review) => (
              <div key={review._id} className="border-b border-border pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-medium text-foreground">
                      {review.name}
                    </span>

                    {review.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {renderStars(review.rating)}
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {review.comment}
                </p>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={submitReview}
          className="mt-8 flex flex-col gap-4 border-t border-border pt-6"
        >
          <h3 className="text-lg font-semibold text-foreground">
            Leave a Review
          </h3>

          {submitMessage && (
            <div
              className={`rounded-md p-3 text-sm ${
                submitMessage.type === "success"
                  ? "bg-green-100 text-green-900"
                  : "bg-red-100 text-red-900"
              }`}
            >
              {submitMessage.text}
            </div>
          )}

          <input
            required
            value={reviewName}
            onChange={(e) => setReviewName(e.target.value)}
            placeholder="Your name"
            disabled={submitting}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />

          <select
            value={reviewRating}
            onChange={(e) => setReviewRating(Number(e.target.value))}
            disabled={submitting}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value={5}>★★★★★ — Excellent</option>
            <option value={4}>★★★★☆ — Good</option>
            <option value={3}>★★★☆☆ — Average</option>
            <option value={2}>★★☆☆☆ — Poor</option>
            <option value={1}>★☆☆☆☆ — Terrible</option>
          </select>

          <textarea
            required
            rows={3}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Write your review..."
            disabled={submitting}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}