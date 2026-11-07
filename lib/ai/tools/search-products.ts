import { tool } from "ai";
import { z } from "zod";
import { apiGet } from "@/lib/api/client";
import type { ApiProduct } from "@/lib/api/types";
import { formatPrice } from "@/lib/utils";
import { getStockStatus, getStockMessage } from "@/lib/constants/stock";
const schema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional().default(""),
  team: z.string().optional().default(""),
  kitType: z.string().optional().default(""),
  size: z.string().optional().default(""),
  minPrice: z.number().nonnegative().optional().default(0),
  maxPrice: z.number().nonnegative().optional().default(0),
});
type Filters = z.infer<typeof schema>;
type Product = ApiProduct & { variants?: { size?: string; stock?: number }[] };
export async function searchProducts(filters: Partial<Filters>) {
  const f = schema.parse(filters);
  const params = new URLSearchParams();
  const query = [f.query, f.team, f.kitType].filter(Boolean).join(" ");
  if (query) params.set("q", query);
  if (f.category)
    params.set(
      "category",
      f.category === "footwear"
        ? "shoes"
        : f.category === "fan-gear"
          ? "accessories"
          : f.category,
    );
  try {
    const rows = await apiGet<Product[]>(`/products?${params}`);
    const selected = rows.filter(
      (p) =>
        (!f.minPrice || p.price >= f.minPrice) &&
        (!f.maxPrice || p.price <= f.maxPrice) &&
        (!f.size ||
          (p.variants ?? []).some(
            (v) => v.size?.trim().toLowerCase() === f.size.trim().toLowerCase(),
          )),
    );
    const products = selected.slice(0, 12).map((p) => {
      const stock = f.size
        ? (p.variants ?? [])
            .filter(
              (v) =>
                v.size?.trim().toLowerCase() === f.size.trim().toLowerCase(),
            )
            .reduce((sum, v) => sum + (v.stock ?? 0), 0)
        : p.stock;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? null,
        price: p.price,
        priceFormatted: formatPrice(p.price),
        category: p.category ?? null,
        categorySlug: p.category ?? null,
        material: null,
        color: null,
        dimensions: null,
        stockCount: stock,
        stockStatus: getStockStatus(stock),
        stockMessage: getStockMessage(stock),
        featured: p.isFeatured ?? false,
        assemblyRequired: false,
        imageUrl: p.images?.[0] ?? null,
        productUrl: `/products/${encodeURIComponent(p.slug)}`,
      };
    });
    return {
      found: products.length > 0,
      message: products.length
        ? `Found ${products.length} matching products.`
        : "No products match these filters.",
      products,
      totalResults: selected.length,
      filters: f,
    };
  } catch {
    return {
      found: false,
      message:
        "The product catalog is temporarily unavailable. Please try again.",
      products: [],
      filters: f,
    };
  }
}
export const searchProductsTool = tool({
  description:
    "Search live merchandise prices and variant stock by category, team, kit, size and budget.",
  inputSchema: schema,
  execute: searchProducts,
});
