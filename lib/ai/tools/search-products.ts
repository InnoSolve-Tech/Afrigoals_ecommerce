import { tool } from "ai";
import { z } from "zod";
import { formatPrice } from "@/lib/utils";
import { getStockStatus, getStockMessage } from "@/lib/constants/stock";
import type { SearchProduct } from "@/lib/ai/types";
import type { ApiProduct } from "@/lib/api/types";

const productSearchSchema = z.object({
  query: z
    .string()
    .optional()
    .default("")
    .describe(
      "Search term to find products by name, description, or category (e.g., 'oak table', 'leather sofa', 'dining')",
    ),
});

export const searchProductsTool = tool({
  description:
    "Search for products in the sports merchandise store by text query. Returns product details including stock availability.",
  inputSchema: productSearchSchema,
  execute: async ({ query }) => {
    console.log("[SearchProducts] Query received:", { query });

    try {
      const apiBaseUrl = (
        process.env.AFRIGOALS_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:8080"
      ).replace(/\/+$/, "");

      const res = await fetch(
        `${apiBaseUrl}/products${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`products query failed: ${res.status}`);
      }
      const products = (await res.json()) as ApiProduct[];

      console.log("[SearchProducts] Products found:", products.length);

      if (products.length === 0) {
        return {
          found: false,
          message:
            "No products found matching your criteria. Try different search terms or filters.",
          products: [],
          filters: { query },
        };
      }

      // Format the results with stock status for the AI to communicate
      const formattedProducts: SearchProduct[] = products.map((product) => ({
        id: product.id,
        name: product.name ?? null,
        slug: product.slug ?? null,
        description: product.description ?? null,
        price: product.price ?? null,
        priceFormatted: product.price ? formatPrice(product.price) : null,
        category: null,
        categorySlug: null,
        material: null,
        color: null,
        dimensions: null,
        stockCount: product.stock ?? 0,
        stockStatus: getStockStatus(product.stock),
        stockMessage: getStockMessage(product.stock),
        featured: false,
        assemblyRequired: false,
        imageUrl: product.images?.[0] ?? null,
        productUrl: product.slug ? `/products/${product.slug}` : null,
      }));

      return {
        found: true,
        message: `Found ${products.length} product${products.length === 1 ? "" : "s"} matching your search.`,
        totalResults: products.length,
        products: formattedProducts,
        filters: { query },
      };
    } catch (error) {
      console.error("[SearchProducts] Error:", error);
      return {
        found: false,
        message: "An error occurred while searching for products.",
        products: [],
        error: error instanceof Error ? error.message : "Unknown error",
        filters: { query },
      };
    }
  },
});
