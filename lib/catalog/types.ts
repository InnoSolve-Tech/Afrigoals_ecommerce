export type CatalogCategory = {
  _id: string;
  title: string;
  slug: string;
  imageUrl?: string;
};

export type CatalogProductVariant = {
  /**
   * Optional unique key from Sanity/API/backend.
   * Useful for tracking the exact selected variant in cart/order items.
   */
  _key?: string;

  /**
   * Optional backend ID if the Go API returns variants with IDs.
   */
  id?: string;

  /**
   * Product size, for example:
   * S, M, L, XL, 42, 43, 44
   */
  size?: string | null;

  /**
   * Product colour/color.
   * Keep both spellings supported because your admin/backend may return either.
   */
  color?: string | null;
  colour?: string | null;

  /**
   * Stock available for this exact variant combination.
   * Example: Size M + Red = 5 pieces.
   */
  stock: number;
};

export type CatalogProductSize = {
  /**
   * Old size-only structure.
   * Keep this temporarily for backward compatibility.
   */
  _key: string;
  size: string;
  stock: number;
};

export type CatalogProduct = {
  _id: string;
  slug: string;
  name: string;
  description?: string;

  dimensions?: string | null;
  assemblyRequired?: boolean | null;

  currency: string;
  price: number;
  compareAtPrice?: number | null;
  soldCount?: number | null;

  /**
   * Total product stock.
   * For products with variants, this should equal the sum of all variant stock.
   */
  stock: number;

  featured?: boolean;

  /**
   * New variant system.
   * This is what the frontend should use going forward.
   *
   * Example:
   * [
   *   { size: "M", color: "Red", stock: 4 },
   *   { size: "M", color: "Blue", stock: 2 },
   *   { size: "L", color: "Red", stock: 0 }
   * ]
   */
  variants?: CatalogProductVariant[] | null;

  /**
   * Old size-only system.
   * Do not remove yet unless all products and UI have fully migrated to variants.
   */
  hasSizes?: boolean | null;
  sizes?: CatalogProductSize[] | null;

  material?: string | null;

  /**
   * General product color.
   * This is not enough for stock control.
   * Variant-level color should be used when variants exist.
   */
  color?: string | null;

  images: string[];

  category?: {
    _id: string;
    title: string;
    slug: string;
  } | null;
};