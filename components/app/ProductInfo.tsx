"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/app/AddToCartButton";
import { AskAISimilarButton } from "@/components/app/AskAISimilarButton";
import { formatPrice } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/catalog/types";

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

  const hasSizes = Boolean(product.hasSizes);
  const rawSizes = product.sizes ?? [];
  const compareAtPrice = product.compareAtPrice ?? null;
  const soldCount = product.soldCount ?? null;
  const price = product.price ?? 0;

  const sizeVariants = rawSizes.map((variant) => ({
    _key: variant._key,
    size: variant.size,
    stock: variant.stock,
  }));

  const [selectedSize, setSelectedSize] = useState<string | null>(
    sizeVariants.length > 0 ? sizeVariants[0].size : null,
  );

  const selectedVariant = sizeVariants.find((v) => v.size === selectedSize);

  const effectiveStock =
    hasSizes && selectedVariant ? selectedVariant.stock : (product.stock ?? 0);

  const isSizeRequired = hasSizes && sizeVariants.length > 0;

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

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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

      {hasSizes && sizeVariants.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Select Size
            </p>

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
            {sizeVariants.map((variant) => {
              const outOfStock = variant.stock === 0;
              const isLowStock = variant.stock > 0 && variant.stock <= 5;
              const isSelected = selectedSize === variant.size;

              return (
                <button
                  key={variant._key}
                  type="button"
                  disabled={outOfStock}
                  onClick={() => setSelectedSize(variant.size)}
                  title={
                    outOfStock
                      ? "Out of stock"
                      : isLowStock
                        ? `Only ${variant.stock} left`
                        : `${variant.stock} available`
                  }
                  className={[
                    "relative rounded-md border px-4 py-2 text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary hover:bg-accent",
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

                  {variant.size}

                  {isLowStock && !outOfStock && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-orange-400" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 min-h-[20px]">
            {selectedVariant ? (
              <p
                className={[
                  "text-xs font-medium",
                  selectedVariant.stock === 0
                    ? "text-red-500"
                    : selectedVariant.stock <= 5
                      ? "text-orange-500"
                      : "text-green-600",
                ].join(" ")}
              >
                {selectedVariant.stock === 0
                  ? "Out of stock"
                  : selectedVariant.stock <= 5
                    ? `⚠ Only ${selectedVariant.stock} left in size ${selectedVariant.size}`
                    : `✓ In stock (${selectedVariant.stock} available)`}
              </p>
            ) : (
              isSizeRequired && (
                <p className="text-xs text-muted-foreground">
                  Please select a size to continue
                </p>
              )
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <AddToCartButton
          productId={product._id}
          slug={product.slug ?? undefined}
          name={product.name ?? "Unknown Product"}
          price={price}
          image={imageUrl}
          stock={effectiveStock}
          redirectToCartOnAdd
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
        (hasSizes && sizeVariants.length > 0)) && (
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
                  Color
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

            {hasSizes && sizeVariants.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <span className="w-28 shrink-0 pt-0.5 text-muted-foreground">
                  Available Sizes
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {sizeVariants.map((variant) => {
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
                        {variant.size}
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