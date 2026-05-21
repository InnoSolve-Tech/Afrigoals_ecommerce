import { apiGet } from "@/lib/api/client";
import type { ApiProduct } from "@/lib/api/types";
import { apiProductToCatalogProduct } from "@/lib/catalog/adapter";
import { catalogCategories } from "@/lib/catalog/categories";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog/types";

export type CatalogProductQuery = {
  searchQuery?: string;
  categorySlug?: string;
  sport?: string;
  featured?: boolean;
  color?: string;
  material?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "name" | "price_asc" | "price_desc" | "relevance";
};

export function getCatalogCategories(): CatalogCategory[] {
  return catalogCategories;
}

export async function getCatalogProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  try {
    const product = await apiGet<ApiProduct>(
      `/api/v1/products/slug/${encodeURIComponent(slug)}`,
    );

    return apiProductToCatalogProduct(product);
  } catch {
    return null;
  }
}

export async function getCatalogFeaturedProducts(): Promise<CatalogProduct[]> {
  return queryCatalogProducts({
    featured: true,
    sort: "relevance",
  });
}

export async function getCatalogProductsByIds(
  ids: string[],
): Promise<CatalogProduct[]> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return [];
  }

  const qs = new URLSearchParams();
  qs.set("ids", uniqueIds.join(","));

  const products = await apiGet<ApiProduct[]>(`/api/v1/products?${qs}`);

  return products.map(apiProductToCatalogProduct);
}

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

export async function queryCatalogProducts(
  query: CatalogProductQuery = {},
): Promise<CatalogProduct[]> {
  const searchQuery = normalizeText(query.searchQuery ?? "");
  const categorySlug = normalizeText(query.categorySlug ?? "");
  const sport = normalizeText(query.sport ?? "");
  const color = normalizeText(query.color ?? "");
  const material = normalizeText(query.material ?? "");

  const featured = Boolean(query.featured);
  const minPrice = Number.isFinite(query.minPrice) ? (query.minPrice ?? 0) : 0;
  const maxPrice = Number.isFinite(query.maxPrice) ? (query.maxPrice ?? 0) : 0;
  const inStock = Boolean(query.inStock);
  const sort = query.sort ?? "name";

  const qs = new URLSearchParams();

  if (searchQuery) qs.set("q", searchQuery);
  if (categorySlug) qs.set("category", categorySlug);
  if (sport) qs.set("sport", sport);
  if (featured) qs.set("featured", "true");

  let apiProducts: ApiProduct[] = [];

  try {
    apiProducts = await apiGet<ApiProduct[]>(
      `/api/v1/products${qs.toString() ? `?${qs.toString()}` : ""}`,
    );
  } catch {
    apiProducts = [];
  }

  const products = apiProducts.map(apiProductToCatalogProduct);

  const filtered = products.filter((product) => {
    const price = product.price ?? 0;
    const stock = product.stock ?? 0;

    if (minPrice > 0 && price < minPrice) return false;
    if (maxPrice > 0 && price > maxPrice) return false;
    if (inStock && stock <= 0) return false;

    if (color) {
      const productColor = normalizeText(
        String((product as any).color || (product as any).colors || ""),
      );

      if (!productColor.includes(color)) return false;
    }

    if (material) {
      const productMaterial = normalizeText(
        String((product as any).material || (product as any).materials || ""),
      );

      if (!productMaterial.includes(material)) return false;
    }

    return true;
  });

  const compareByName = (a: CatalogProduct, b: CatalogProduct) =>
    (a.name ?? "").localeCompare(b.name ?? "");

  const compareByPriceAsc = (a: CatalogProduct, b: CatalogProduct) =>
    (a.price ?? 0) - (b.price ?? 0);

  const compareByPriceDesc = (a: CatalogProduct, b: CatalogProduct) =>
    (b.price ?? 0) - (a.price ?? 0);

  if (sort === "price_asc") return filtered.slice().sort(compareByPriceAsc);
  if (sort === "price_desc") return filtered.slice().sort(compareByPriceDesc);
  if (sort === "relevance" && searchQuery) return filtered;

  return filtered.slice().sort(compareByName);
}