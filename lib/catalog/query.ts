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

type RawVariant = {
  _key?: string;
  id?: string;
  size?: string | null;
  color?: string | null;
  colour?: string | null;
  stock?: number | string | null;
  qty?: number | string | null;
  quantity?: number | string | null;
};

type ApiProductWithVariants = ApiProduct & {
  id?: string;
  _id?: string;
  variants?: RawVariant[] | null;
  category?: string | null;
  sport?: string | null;
  isFeatured?: boolean;
  is_featured?: boolean;
};

export function getCatalogCategories(): CatalogCategory[] {
  return catalogCategories;
}

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

function normalizeApiVariants(product: ApiProductWithVariants) {
  const rawVariants = Array.isArray(product.variants) ? product.variants : [];

  return rawVariants
    .map((variant, index) => {
      const size = String(variant.size || "").trim();
      const color = String(variant.color || variant.colour || "").trim();

      const rawStock = Number(
        variant.stock ?? variant.qty ?? variant.quantity ?? 0,
      );

      const stock = Number.isFinite(rawStock) ? Math.max(0, rawStock) : 0;

      return {
        _key:
          variant._key ||
          variant.id ||
          `${size || "no-size"}-${color || "no-color"}-${index}`,
        id: variant.id,
        size: size || null,
        color: color || null,
        colour: color || null,
        stock,
      };
    })
    .filter((variant) => variant.size || variant.color);
}

function apiProductToCatalogProductWithVariants(
  apiProduct: ApiProduct,
): CatalogProduct {
  const rawProduct = apiProduct as ApiProductWithVariants;
  const catalogProduct = apiProductToCatalogProduct(apiProduct);
  const variants = normalizeApiVariants(rawProduct);

  const stock =
    variants.length > 0
      ? variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
      : Number(catalogProduct.stock || 0);

  return {
    ...catalogProduct,

    /**
     * Important:
     * Some API endpoints use id, while the catalog uses _id.
     */
    _id: catalogProduct._id || rawProduct._id || rawProduct.id || "",

    /**
     * Important:
     * Preserve variant stock from the API.
     */
    variants,

    /**
     * For variant products, total stock must equal variant stock sum.
     */
    stock,

    /**
     * These fields are coming correctly from /products,
     * but may be missing from /products/slug/:slug.
     */
    featured: Boolean(
      catalogProduct.featured ?? rawProduct.isFeatured ?? rawProduct.is_featured,
    ),
  };
}

async function fetchAllApiProducts(): Promise<ApiProduct[]> {
  try {
    return await apiGet<ApiProduct[]>("/products");
  } catch {
    return [];
  }
}

export async function getCatalogProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  const normalizedSlug = normalizeText(slug);

  /**
   * Use /products first because your /products endpoint includes variants,
   * while /products/slug/:slug currently returns an incomplete payload.
   */
  const apiProducts = await fetchAllApiProducts();

  const matchedFromList = apiProducts.find((product) => {
    const rawProduct = product as ApiProductWithVariants;
    return normalizeText(String(rawProduct.slug || "")) === normalizedSlug;
  });

  if (matchedFromList) {
    return apiProductToCatalogProductWithVariants(matchedFromList);
  }

  /**
   * Fallback only.
   * This endpoint is currently incomplete in your app, but keep it so the page
   * does not break if /products fails.
   */
  try {
    const product = await apiGet<ApiProduct>(
      `/products/slug/${encodeURIComponent(slug)}`,
    );

    return apiProductToCatalogProductWithVariants(product);
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

  let products: ApiProduct[] = [];

  try {
    products = await apiGet<ApiProduct[]>(`/products?${qs}`);
  } catch {
    products = [];
  }

  return products.map(apiProductToCatalogProductWithVariants);
}

function productMatchesColor(product: CatalogProduct, color: string) {
  const productColor = normalizeText(
    String((product as any).color || (product as any).colors || ""),
  );

  if (productColor.includes(color)) {
    return true;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];

  return variants.some((variant) => {
    const variantColor = normalizeText(
      String(variant.color || variant.colour || ""),
    );

    return variantColor.includes(color);
  });
}

function productMatchesMaterial(product: CatalogProduct, material: string) {
  const productMaterial = normalizeText(
    String((product as any).material || (product as any).materials || ""),
  );

  return productMaterial.includes(material);
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
      `/products${qs.toString() ? `?${qs.toString()}` : ""}`,
    );
  } catch {
    apiProducts = [];
  }

  const products = apiProducts.map(apiProductToCatalogProductWithVariants);

  const filtered = products.filter((product) => {
    const price = product.price ?? 0;
    const stock = product.stock ?? 0;

    if (minPrice > 0 && price < minPrice) return false;
    if (maxPrice > 0 && price > maxPrice) return false;
    if (inStock && stock <= 0) return false;

    if (color && !productMatchesColor(product, color)) {
      return false;
    }

    if (material && !productMatchesMaterial(product, material)) {
      return false;
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