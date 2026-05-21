"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/lib/auth/client";
import type { ApiProduct, ApiProductAccessory } from "@/lib/api/types";
import { formatPrice } from "@/lib/utils";
import { ProductUpsertDialog } from "@/components/admin/ProductUpsertDialog";
import { AccessoryUpsertDialog } from "@/components/admin/AccessoryUpsertDialog";
import { ProductAccessoryAssignment } from "@/components/admin/ProductAccessoryAssignment";

const PRODUCT_CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "general", label: "General" },
  { value: "jerseys", label: "Jerseys" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
  { value: "training", label: "Training" },
  { value: "gym", label: "Gym" },
  { value: "merchandise", label: "Merchandise" },
] as const;

const SPORT_CATEGORIES = [
  { value: "", label: "All sports" },
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "running", label: "Running" },
  { value: "cricket", label: "Cricket" },
  { value: "rugby", label: "Rugby" },
  { value: "volleyball", label: "Volleyball" },
  { value: "gym", label: "Gym" },
] as const;

type FlexibleApiProduct = ApiProduct & {
  category?: string;
  sport?: string;
  sportCategory?: string;
  sport_category?: string;
  isFeatured?: boolean;
  is_featured?: boolean;
};

function getProductCategory(product: FlexibleApiProduct) {
  return String(product.category || "general").trim() || "general";
}

function getProductSport(product: FlexibleApiProduct) {
  return (
    String(product.sport || product.sportCategory || product.sport_category || "")
      .trim()
      .toLowerCase() || ""
  );
}

function productIsFeatured(product: FlexibleApiProduct) {
  return Boolean(product.isFeatured ?? product.is_featured);
}

function formatCategoryLabel(category?: string | null) {
  const raw = String(category || "general").trim();

  const found = PRODUCT_CATEGORIES.find((item) => item.value === raw);
  if (found) return found.label;

  return raw
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSportLabel(sport?: string | null) {
  const raw = String(sport || "").trim();

  if (!raw) return "—";

  const found = SPORT_CATEGORIES.find((item) => item.value === raw);
  if (found) return found.label;

  return raw
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildProductPayload(
  product: FlexibleApiProduct,
  updates: Partial<{
    category: string;
    sport: string;
    isFeatured: boolean;
  }>,
) {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description || "",
    category: updates.category ?? getProductCategory(product),
    sport: updates.sport ?? getProductSport(product),
    isFeatured: updates.isFeatured ?? productIsFeatured(product),
    currency: product.currency || "UGX",
    price: Number(product.price || 0),
    images: product.images || [],
    stock: Number(product.stock || 0),
  };
}

export default function AdminProductsPage() {
  const { status, user } = useAuthState();
  const isAdmin = user?.role === "admin";
  const canUseAdmin = status !== "loading" && isAdmin;

  const [products, setProducts] = useState<FlexibleApiProduct[]>([]);
  const [accessories, setAccessories] = useState<ApiProductAccessory[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingAccessories, setLoadingAccessories] = useState(true);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<FlexibleApiProduct | null>(null);

  const [accessoryOpen, setAccessoryOpen] = useState(false);
  const [accessoryMode, setAccessoryMode] = useState<"create" | "edit">(
    "create",
  );
  const [selectedAccessory, setSelectedAccessory] =
    useState<ApiProductAccessory | null>(null);

  const [accessoryAssignOpen, setAccessoryAssignOpen] = useState(false);
  const [accessoryProduct, setAccessoryProduct] =
    useState<FlexibleApiProduct | null>(null);

  const productQuery = useMemo(() => {
    const qs = new URLSearchParams();

    if (categoryFilter) qs.set("category", categoryFilter);
    if (sportFilter) qs.set("sport", sportFilter);
    if (featuredFilter) qs.set("featured", featuredFilter);

    return qs.toString();
  }, [categoryFilter, sportFilter, featuredFilter]);

  async function loadProducts() {
    setLoadingProducts(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/products${productQuery ? `?${productQuery}` : ""}`,
        { cache: "no-store" },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (data as any)?.error || `Failed to load products (${res.status})`,
        );
        setProducts([]);
        return;
      }

      setProducts(data as FlexibleApiProduct[]);
    } catch {
      setError("Failed to load products");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadAccessories() {
    setLoadingAccessories(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/accessories", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (data as any)?.error ||
            `Failed to load accessories (${res.status})`,
        );
        setAccessories([]);
        return;
      }

      setAccessories(data as ApiProductAccessory[]);
    } catch {
      setError("Failed to load accessories");
      setAccessories([]);
    } finally {
      setLoadingAccessories(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadAccessories()]);
  }

  useEffect(() => {
    if (canUseAdmin) {
      refreshAll();
      return;
    }

    setLoadingProducts(false);
    setLoadingAccessories(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseAdmin]);

  useEffect(() => {
    if (canUseAdmin) {
      loadProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery]);

  async function updateProduct(
    product: FlexibleApiProduct,
    updates: Partial<{
      category: string;
      sport: string;
      isFeatured: boolean;
    }>,
  ) {
    setError(null);
    setSavingProductId(product.id);

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildProductPayload(product, updates)),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as any)?.error || "Failed to update product");
        return;
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? (data as FlexibleApiProduct) : item,
        ),
      );
    } catch {
      setError("Failed to update product");
    } finally {
      setSavingProductId(null);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;

    setError(null);

    const res = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as any)?.error || "Failed to delete product");
      return;
    }

    await loadProducts();
  }

  async function disableAccessory(id: string) {
    if (!confirm("Disable this accessory?")) return;

    setError(null);

    const res = await fetch(`/api/admin/accessories/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as any)?.error || "Failed to disable accessory");
      return;
    }

    await loadAccessories();
  }

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="space-y-2 px-3 sm:px-0">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-red-600 dark:text-red-400">Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 px-3 sm:px-0">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Products
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Create products, assign categories, assign sports, and mark
              featured products.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:flex xl:flex-wrap xl:justify-end">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:min-w-40"
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category.value || "all"} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:min-w-36"
            >
              {SPORT_CATEGORIES.map((sport) => (
                <option key={sport.value || "all"} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>

            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:min-w-36"
            >
              <option value="">All products</option>
              <option value="true">Featured only</option>
            </select>

            <Button
              variant="outline"
              onClick={loadProducts}
              disabled={loadingProducts}
              className="w-full xl:w-auto"
            >
              Refresh
            </Button>

            <Button
              className="w-full xl:w-auto"
              onClick={() => {
                setSelected(null);
                setUpsertMode("create");
                setUpsertOpen(true);
              }}
            >
              New product
            </Button>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="space-y-3 md:hidden">
          {loadingProducts ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Loading...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              No products yet.
            </div>
          ) : (
            products.map((p) => {
              const isSaving = savingProductId === p.id;
              const category = getProductCategory(p);
              const sport = getProductSport(p);
              const featured = productIsFeatured(p);

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-zinc-100 dark:bg-zinc-900">
                      {p.images?.[0] ? (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </h3>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {p.slug}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {formatCategoryLabel(category)}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                          {formatSportLabel(sport)}
                        </span>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-xs",
                            featured
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
                          ].join(" ")}
                        >
                          {featured ? "Featured" : "Normal"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Price
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatPrice(p.price, p.currency)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Stock
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {p.stock}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Category
                      </span>
                      <select
                        value={category}
                        disabled={isSaving}
                        onChange={(e) =>
                          updateProduct(p, { category: e.target.value })
                        }
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {PRODUCT_CATEGORIES.filter(
                          (item) => item.value !== "",
                        ).map((categoryOption) => (
                          <option
                            key={categoryOption.value}
                            value={categoryOption.value}
                          >
                            {categoryOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Sport
                      </span>
                      <select
                        value={sport}
                        disabled={isSaving}
                        onChange={(e) =>
                          updateProduct(p, { sport: e.target.value })
                        }
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value="">None</option>
                        {SPORT_CATEGORIES.filter(
                          (item) => item.value !== "",
                        ).map((sportOption) => (
                          <option
                            key={sportOption.value}
                            value={sportOption.value}
                          >
                            {sportOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        Featured
                      </span>
                      <input
                        type="checkbox"
                        checked={featured}
                        disabled={isSaving}
                        onChange={(e) =>
                          updateProduct(p, { isFeatured: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelected(p);
                        setUpsertMode("edit");
                        setUpsertOpen(true);
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setAccessoryProduct(p);
                        setAccessoryAssignOpen(true);
                      }}
                    >
                      Accessories
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteProduct(p.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sport</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loadingProducts ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                      colSpan={7}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                      colSpan={7}
                    >
                      No products yet.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isSaving = savingProductId === p.id;
                    const category = getProductCategory(p);
                    const sport = getProductSport(p);
                    const featured = productIsFeatured(p);

                    return (
                      <tr
                        key={p.id}
                        className="border-t border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-zinc-100 dark:bg-zinc-900">
                              {p.images?.[0] ? (
                                <Image
                                  src={p.images[0]}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                {p.name}
                              </div>
                              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {p.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={category}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(p, { category: e.target.value })
                            }
                            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            {PRODUCT_CATEGORIES.filter(
                              (item) => item.value !== "",
                            ).map((categoryOption) => (
                              <option
                                key={categoryOption.value}
                                value={categoryOption.value}
                              >
                                {categoryOption.label}
                              </option>
                            ))}
                          </select>

                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatCategoryLabel(category)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={sport}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(p, { sport: e.target.value })
                            }
                            className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <option value="">None</option>
                            {SPORT_CATEGORIES.filter(
                              (item) => item.value !== "",
                            ).map((sportOption) => (
                              <option
                                key={sportOption.value}
                                value={sportOption.value}
                              >
                                {sportOption.label}
                              </option>
                            ))}
                          </select>

                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatSportLabel(sport)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={featured}
                              disabled={isSaving}
                              onChange={(e) =>
                                updateProduct(p, {
                                  isFeatured: e.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-zinc-300"
                            />

                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-xs",
                                featured
                                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
                              ].join(" ")}
                            >
                              {featured ? "Featured" : "Normal"}
                            </span>
                          </label>
                        </td>

                        <td className="px-4 py-3">
                          {formatPrice(p.price, p.currency)}
                        </td>

                        <td className="px-4 py-3">{p.stock}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelected(p);
                                setUpsertMode("edit");
                                setUpsertOpen(true);
                              }}
                            >
                              Edit
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAccessoryProduct(p);
                                setAccessoryAssignOpen(true);
                              }}
                            >
                              Accessories
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteProduct(p.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Accessories
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
              Manage dynamic product accessories, branding, badges, and kit
              extras.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
            <Button
              variant="outline"
              onClick={loadAccessories}
              disabled={loadingAccessories}
              className="w-full lg:w-auto"
            >
              Refresh
            </Button>

            <Button
              className="w-full lg:w-auto"
              onClick={() => {
                setSelectedAccessory(null);
                setAccessoryMode("create");
                setAccessoryOpen(true);
              }}
            >
              New accessory
            </Button>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {loadingAccessories ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Loading accessories...
            </div>
          ) : accessories.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              No accessories yet.
            </div>
          ) : (
            accessories.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                      {a.name}
                    </h3>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {a.code}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      a.isActive
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {a.description ? (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {a.description}
                  </p>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Price
                    </p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatPrice(a.price, "ugx")}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Category
                    </p>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {a.appliesToCategory || "general"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1">
                  {a.isBranding ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Branding
                    </span>
                  ) : null}

                  {a.requiresText ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      Text
                    </span>
                  ) : null}

                  {a.requiresNumber ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      Number
                    </span>
                  ) : null}

                  {!a.isBranding && !a.requiresText && !a.requiresNumber ? (
                    <span className="text-xs text-zinc-500">No rules</span>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedAccessory(a);
                      setAccessoryMode("edit");
                      setAccessoryOpen(true);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => disableAccessory(a.id)}
                    disabled={!a.isActive}
                  >
                    Disable
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Accessory</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Rules</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loadingAccessories ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                      colSpan={6}
                    >
                      Loading accessories...
                    </td>
                  </tr>
                ) : accessories.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                      colSpan={6}
                    >
                      No accessories yet.
                    </td>
                  </tr>
                ) : (
                  accessories.map((a) => (
                    <tr
                      key={a.id}
                      className="border-t border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {a.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {a.code}
                        </div>
                        {a.description ? (
                          <div className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                            {a.description}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        {formatPrice(a.price, "ugx")}
                      </td>

                      <td className="px-4 py-3">
                        {a.appliesToCategory || "general"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.isBranding ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Branding
                            </span>
                          ) : null}

                          {a.requiresText ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                              Text
                            </span>
                          ) : null}

                          {a.requiresNumber ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                              Number
                            </span>
                          ) : null}

                          {!a.isBranding &&
                          !a.requiresText &&
                          !a.requiresNumber ? (
                            <span className="text-xs text-zinc-500">—</span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            a.isActive
                              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                          }`}
                        >
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAccessory(a);
                              setAccessoryMode("edit");
                              setAccessoryOpen(true);
                            }}
                          >
                            Edit
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => disableAccessory(a.id)}
                            disabled={!a.isActive}
                          >
                            Disable
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ProductUpsertDialog
        open={upsertOpen}
        onOpenChange={setUpsertOpen}
        mode={upsertMode}
        product={selected}
        onSaved={loadProducts}
      />

      <AccessoryUpsertDialog
        open={accessoryOpen}
        onOpenChange={setAccessoryOpen}
        mode={accessoryMode}
        accessory={selectedAccessory}
        onSaved={loadAccessories}
      />

      <ProductAccessoryAssignment
        open={accessoryAssignOpen}
        onOpenChange={setAccessoryAssignOpen}
        product={accessoryProduct}
      />
    </div>
  );
}