"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { COLORS, MATERIALS, SORT_OPTIONS } from "@/lib/constants/filters";
import { formatPrice } from "@/lib/utils";
import type { CatalogCategory } from "@/lib/catalog/types";

interface ProductFiltersProps {
  categories: CatalogCategory[];
}

const SPORT_CATEGORIES = [
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "running", label: "Running" },
  { value: "cricket", label: "Cricket" },
  { value: "rugby", label: "Rugby" },
  { value: "volleyball", label: "Volleyball" },
  { value: "gym", label: "Gym" },
  { value: "general", label: "General" },
] as const;

function getCategoryId(category: CatalogCategory) {
  return String(
    (category as any).slug ||
      (category as any)._id ||
      (category as any).id ||
      "",
  );
}

function getCategoryLabel(category: CatalogCategory) {
  return String(
    (category as any).title ||
      (category as any).name ||
      (category as any).slug ||
      "Category",
  );
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("q") ?? "";
  const currentCategory = searchParams.get("category") ?? "";
  const currentSport = searchParams.get("sport") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";
  const currentSort = searchParams.get("sort") ?? "name";
  const currentFeatured = searchParams.get("featured") === "true";
  const urlMinPrice = Number(searchParams.get("minPrice")) || 0;
  const urlMaxPrice = Number(searchParams.get("maxPrice")) || 50000;
  const currentInStock = searchParams.get("inStock") === "true";

  const [priceRange, setPriceRange] = useState<[number, number]>([
    urlMinPrice,
    urlMaxPrice,
  ]);

  useEffect(() => {
    setPriceRange([urlMinPrice, urlMaxPrice]);
  }, [urlMinPrice, urlMaxPrice]);

  const isSearchActive = !!currentSearch;
  const isCategoryActive = !!currentCategory;
  const isSportActive = !!currentSport;
  const isColorActive = !!currentColor;
  const isMaterialActive = !!currentMaterial;
  const isPriceActive = urlMinPrice > 0 || urlMaxPrice < 50000;
  const isFeaturedActive = currentFeatured;
  const isInStockActive = currentInStock;

  const hasActiveFilters =
    isSearchActive ||
    isCategoryActive ||
    isSportActive ||
    isColorActive ||
    isMaterialActive ||
    isPriceActive ||
    isFeaturedActive ||
    isInStockActive;

  const activeFilterCount = [
    isSearchActive,
    isCategoryActive,
    isSportActive,
    isColorActive,
    isMaterialActive,
    isPriceActive,
    isFeaturedActive,
    isInStockActive,
  ].filter(Boolean).length;

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === 0) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      router.push(`/products?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const searchQuery = String(formData.get("search") || "").trim();

    updateParams({ q: searchQuery || null });
  };

  const handleClearFilters = () => {
    router.push("/products", { scroll: false });
  };

  const clearSingleFilter = (key: string) => {
    if (key === "price") {
      updateParams({ minPrice: null, maxPrice: null });
      return;
    }

    updateParams({ [key]: null });
  };

  const FilterLabel = ({
    children,
    isActive,
    filterKey,
  }: {
    children: React.ReactNode;
    isActive: boolean;
    filterKey: string;
  }) => (
    <div className="mb-2 flex items-center justify-between">
      <span
        className={`block text-sm font-medium ${
          isActive
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {children}
        {isActive ? (
          <Badge className="ml-2 h-5 bg-primary px-1.5 text-xs text-white hover:bg-primary">
            Active
          </Badge>
        ) : null}
      </span>

      {isActive ? (
        <button
          type="button"
          onClick={() => clearSingleFilter(filterKey)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          aria-label={`Clear ${filterKey} filter`}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      {hasActiveFilters ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              {activeFilterCount}{" "}
              {activeFilterCount === 1 ? "filter" : "filters"} applied
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleClearFilters}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        </div>
      ) : null}

      <div>
        <FilterLabel isActive={isSearchActive} filterKey="q">
          Search
        </FilterLabel>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            name="search"
            placeholder="Search products..."
            defaultValue={currentSearch}
            className={`flex-1 ${
              isSearchActive
                ? "border-primary ring-1 ring-primary dark:border-primary dark:ring-primary"
                : ""
            }`}
          />

          <Button
            type="submit"
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
          >
            Search
          </Button>
        </form>
      </div>

      <div>
        <FilterLabel isActive={isCategoryActive} filterKey="category">
          Product Category
        </FilterLabel>

        <Select
          value={currentCategory || "all"}
          onValueChange={(value) =>
            updateParams({ category: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className={
              isCategoryActive
                ? "border-primary ring-1 ring-primary dark:border-primary dark:ring-primary"
                : ""
            }
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>

            {categories.map((category) => {
              const value = getCategoryId(category);
              const label = getCategoryLabel(category);

              if (!value) return null;

              return (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FilterLabel isActive={isSportActive} filterKey="sport">
          Sport
        </FilterLabel>

        <Select
          value={currentSport || "all"}
          onValueChange={(value) =>
            updateParams({ sport: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className={
              isSportActive
                ? "border-primary ring-1 ring-primary dark:border-primary dark:ring-primary"
                : ""
            }
          >
            <SelectValue placeholder="All Sports" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>

            {SPORT_CATEGORIES.map((sport) => (
              <SelectItem key={sport.value} value={sport.value}>
                {sport.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FilterLabel isActive={isFeaturedActive} filterKey="featured">
          Featured
        </FilterLabel>

        <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Featured products only
            {isFeaturedActive ? (
              <Badge className="ml-2 h-5 bg-primary px-1.5 text-xs text-white hover:bg-primary">
                Active
              </Badge>
            ) : null}
          </span>

          <input
            type="checkbox"
            checked={currentFeatured}
            onChange={(e) =>
              updateParams({ featured: e.target.checked ? "true" : null })
            }
            className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary dark:border-zinc-600 dark:bg-zinc-800"
          />
        </label>
      </div>

      <div>
        <FilterLabel isActive={isColorActive} filterKey="color">
          Color
        </FilterLabel>

        <Select
          value={currentColor || "all"}
          onValueChange={(value) =>
            updateParams({ color: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className={
              isColorActive
                ? "border-primary ring-1 ring-primary dark:border-primary dark:ring-primary"
                : ""
            }
          >
            <SelectValue placeholder="All Colors" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {COLORS.map((color) => (
              <SelectItem key={color.value} value={color.value}>
                {color.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FilterLabel isActive={isMaterialActive} filterKey="material">
          Material
        </FilterLabel>

        <Select
          value={currentMaterial || "all"}
          onValueChange={(value) =>
            updateParams({ material: value === "all" ? null : value })
          }
        >
          <SelectTrigger
            className={
              isMaterialActive
                ? "border-primary ring-1 ring-primary dark:border-primary dark:ring-primary"
                : ""
            }
          >
            <SelectValue placeholder="All Materials" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {MATERIALS.map((material) => (
              <SelectItem key={material.value} value={material.value}>
                {material.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FilterLabel isActive={isPriceActive} filterKey="price">
          Price Range: {formatPrice(priceRange[0])} -{" "}
          {formatPrice(priceRange[1])}
        </FilterLabel>

        <Slider
          min={0}
          max={50000}
          step={100}
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          onValueCommit={([min, max]) =>
            updateParams({
              minPrice: min > 0 ? min : null,
              maxPrice: max < 50000 ? max : null,
            })
          }
          className={`mt-4 ${
            isPriceActive
              ? "[&_[role=slider]]:border-primary [&_[role=slider]]:ring-primary"
              : ""
          }`}
        />
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={currentInStock}
            onChange={(e) =>
              updateParams({ inStock: e.target.checked ? "true" : null })
            }
            className="h-5 w-5 rounded border-zinc-300 text-primary focus:ring-primary dark:border-zinc-600 dark:bg-zinc-800"
          />

          <span
            className={`text-sm font-medium ${
              isInStockActive
                ? "text-zinc-900 dark:text-zinc-100"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            Show only in-stock
            {isInStockActive ? (
              <Badge className="ml-2 h-5 bg-primary px-1.5 text-xs text-white hover:bg-primary">
                Active
              </Badge>
            ) : null}
          </span>
        </label>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Sort By
        </span>

        <Select
          value={currentSort}
          onValueChange={(value) => updateParams({ sort: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}