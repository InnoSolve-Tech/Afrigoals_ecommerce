import { CategoryTiles } from "@/components/app/CategoryTiles";
import { ProductSection } from "@/components/app/ProductSection";
import {
  getCatalogCategories,
  queryCatalogProducts,
} from "@/lib/catalog/query";

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sport?: string;
    featured?: string;
    color?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    inStock?: string;
  }>;
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;

  const searchQuery = params.q ?? "";
  const categorySlug = params.category ?? "";
  const sport = params.sport ?? "";
  const featured = params.featured === "true";
  const color = params.color ?? "";
  const material = params.material ?? "";
  const minPrice = Number(params.minPrice) || 0;
  const maxPrice = Number(params.maxPrice) || 0;
  const sort = params.sort ?? "name";
  const inStock = params.inStock === "true";

  const products = await queryCatalogProducts({
    searchQuery,
    categorySlug,
    sport,
    featured,
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

  const pageTitle = searchQuery
    ? `Search Results for "${searchQuery}"`
    : categorySlug
      ? `Shop ${formatLabel(categorySlug)}`
      : sport
        ? `Shop ${formatLabel(sport)}`
        : featured
          ? "Featured Products"
          : "Browse Products";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 pt-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            {pageTitle}
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