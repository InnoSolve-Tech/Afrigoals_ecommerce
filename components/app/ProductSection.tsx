"use client";

import { Filter, PanelLeftClose, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog/types";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";

interface ProductSectionProps {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  searchQuery: string;
}

export function ProductSection({
  categories,
  products,
  searchQuery,
}: ProductSectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      setFiltersOpen(window.innerWidth >= 1024);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Search className="h-4 w-4" />
              <span>Catalog results</span>
            </div>

            <h2 className="mt-1 text-xl font-bold text-gray-950 dark:text-gray-50 sm:text-2xl">
              {products.length}{" "}
              {products.length === 1 ? "product found" : "products found"}
            </h2>

            {hasSearchQuery ? (
              <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
                Search results for{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  &quot;{searchQuery}&quot;
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Browse AfriGoals products by category, sport, and featured
                collections.
              </p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((current) => !current)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-gray-300 bg-white shadow-sm transition-all hover:border-primary hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 sm:w-auto"
            aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          >
            {filtersOpen ? (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Hide filters</span>
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" />
                <span>Show filters</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {filtersOpen ? (
          <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-950 dark:text-gray-50">
                    Filters
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Narrow down products
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltersOpen(false)}
                  className="lg:hidden"
                >
                  Close
                </Button>
              </div>

              <ProductFilters categories={categories} />
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1">
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                No products found
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Try changing the search term or clearing some filters.
              </p>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </main>
      </div>
    </div>
  );
}