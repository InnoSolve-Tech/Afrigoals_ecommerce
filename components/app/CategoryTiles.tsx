"use client";

import Image from "next/image";
import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog/types";

interface CategoryTilesProps {
  categories: CatalogCategory[];
  activeCategory?: string;
  activeSport?: string;
}

const SPORTS = [
  {
    slug: "football",
    title: "Football",
    emoji: "⚽",
  },
  {
    slug: "basketball",
    title: "Basketball",
    emoji: "🏀",
  },
  {
    slug: "tennis",
    title: "Tennis",
    emoji: "🎾",
  },
  {
    slug: "running",
    title: "Running",
    emoji: "🏃",
  },
  {
    slug: "cricket",
    title: "Cricket",
    emoji: "🏏",
  },
  {
    slug: "rugby",
    title: "Rugby",
    emoji: "🏉",
  },
  {
    slug: "volleyball",
    title: "Volleyball",
    emoji: "🏐",
  },
  {
    slug: "gym",
    title: "Gym",
    emoji: "💪",
  },
];

export function CategoryTiles({
  categories,
  activeCategory,
  activeSport,
}: CategoryTilesProps) {
  const normalizedActiveCategory = String(activeCategory || "")
    .trim()
    .toLowerCase();

  const normalizedActiveSport = String(activeSport || "")
    .trim()
    .toLowerCase();

  const hasActiveFilter = Boolean(
    normalizedActiveCategory || normalizedActiveSport,
  );

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <Link
          href="/products"
          className={`group flex min-h-28 flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${
            !hasActiveFilter
              ? "border-primary bg-primary/5"
              : "border-gray-200 bg-white hover:border-primary hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-primary/10"
          }`}
        >
          <span className="mb-2 text-3xl">🛍️</span>
          <span className="text-xs font-semibold text-foreground sm:text-sm">
            All Products
          </span>
        </Link>

        {categories.map((category) => {
          const slug = String(category.slug || "").trim().toLowerCase();

          if (!slug) {
            return null;
          }

          const isActive = normalizedActiveCategory === slug;
          const imageUrl = category.imageUrl;

          return (
            <Link
              key={category._id || slug}
              href={`/products?category=${encodeURIComponent(slug)}`}
              className={`group flex min-h-28 flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:border-primary hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-primary/10"
              }`}
            >
              <span className="relative mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-2xl dark:bg-gray-700">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={category.title ?? "Category"}
                    fill
                    className="object-cover transition-transform group-hover:scale-110"
                    sizes="48px"
                  />
                ) : (
                  "🏅"
                )}
              </span>

              <span className="text-xs font-semibold text-foreground sm:text-sm">
                {category.title}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-gray-200 py-8 dark:border-gray-800">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-foreground">
            Shop by Sport
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Explore gear for your favorite sports
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
          {SPORTS.map((sport) => {
            const isActive = normalizedActiveSport === sport.slug;

            return (
              <Link
                key={sport.slug}
                href={`/products?sport=${encodeURIComponent(sport.slug)}`}
                className={`group flex min-h-28 flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-primary hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-primary/10"
                }`}
              >
                <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-2xl transition-transform group-hover:scale-110 dark:bg-gray-700">
                  {sport.emoji}
                </span>

                <span className="text-xs font-semibold text-foreground sm:text-sm">
                  {sport.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}