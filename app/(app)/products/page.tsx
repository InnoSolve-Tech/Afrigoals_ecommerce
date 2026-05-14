import type { Metadata } from "next";
import { CategoryTiles } from "@/components/app/CategoryTiles";
import { ProductSection } from "@/components/app/ProductSection";
import {
  getCatalogCategories,
  queryCatalogProducts,
} from "@/lib/catalog/query";
import { buildMetadata } from "@/lib/seo";

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    color?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  }>;
}

function formatCategoryLabel(slug: string, fallback = "Browse Products") {
  if (!slug) return fallback;

  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasSearch = Boolean(params.q);
  const hasFilters = Boolean(
    params.category ||
      params.color ||
      params.material ||
      params.minPrice ||
      params.maxPrice ||
      params.inStock,
  );

  if (hasSearch || hasFilters) {
    const categoryLabel = formatCategoryLabel(
      params.category ?? "",
      "Products",
    );

    return buildMetadata({
      title: hasSearch ? "Product Search" : `${categoryLabel} Products`,
      description:
        "Browse Afrigoals products using search and filters to find the right sports gear.",
      path: "/products",
      index: false,
    });
  }

  return buildMetadata({
    title: "Sports Apparel and Equipment",
    description:
      "Browse sports attire, shoes, and accessories from Afrigoals vendors.",
    path: "/products",
  });
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;

  const searchQuery = params.q ?? "";
  const categorySlug = params.category ?? "";
  const color = params.color ?? "";
  const material = params.material ?? "";
  const minPrice = Number(params.minPrice) || 0;
  const maxPrice = Number(params.maxPrice) || 0;
  const sort = params.sort ?? "name";
  const inStock = params.inStock === "true";

  const products = await queryCatalogProducts({
    searchQuery,
    categorySlug,
    color,
    material,
    minPrice,
    maxPrice,
    inStock,
    sort:
      sort === "price_asc" || sort === "price_desc" || sort === "relevance"
        ? sort
        : "name",
  });

  const categories = getCatalogCategories();
  const activeCategory = categories.find(
    (category) => category.slug === categorySlug,
  );
  const categoryLabel =
    activeCategory?.title ?? formatCategoryLabel(categorySlug);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 pt-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : categorySlug
                ? `Shop ${categoryLabel}`
                : "Browse Products"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quality sports attire, shoes and equipment from Afrigoals vendors.
          </p>
        </div>

        <div className="mt-6">
          <CategoryTiles
            categories={categories}
            activeCategory={categorySlug || undefined}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <ProductSection
          categories={categories}
          products={products}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
