"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/lib/auth/client";
import type { ApiProduct, ApiProductAccessory } from "@/lib/api/types";
import { formatPrice } from "@/lib/utils";
import { ProductUpsertDialog } from "@/components/admin/ProductUpsertDialog";
import { AccessoryUpsertDialog } from "@/components/admin/AccessoryUpsertDialog";
import { ProductAccessoryAssignment } from "@/components/admin/ProductAccessoryAssignment";

export default function AdminProductsPage() {
  const { status, user } = useAuthState();
  const isAdmin = user?.role === "admin";
  const canUseAdmin = status !== "loading" && isAdmin;

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [accessories, setAccessories] = useState<ApiProductAccessory[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingAccessories, setLoadingAccessories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<ApiProduct | null>(null);

  const [accessoryOpen, setAccessoryOpen] = useState(false);
  const [accessoryMode, setAccessoryMode] = useState<"create" | "edit">(
    "create",
  );
  const [selectedAccessory, setSelectedAccessory] =
    useState<ApiProductAccessory | null>(null);

  const [accessoryAssignOpen, setAccessoryAssignOpen] = useState(false);
  const [accessoryProduct, setAccessoryProduct] = useState<ApiProduct | null>(
    null,
  );

  async function loadProducts() {
    setLoadingProducts(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (data as any)?.error || `Failed to load products (${res.status})`,
        );
        setProducts([]);
        return;
      }

      setProducts(data as ApiProduct[]);
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
  }, [canUseAdmin]);

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
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-red-600 dark:text-red-400">Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Products
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create and edit store products.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadProducts}
              disabled={loadingProducts}
            >
              Refresh
            </Button>

            <Button
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
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3">Product</th>
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
                      colSpan={4}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-500 dark:text-zinc-400"
                      colSpan={4}
                    >
                      No products yet.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
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

                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {p.name}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {p.slug}
                            </div>
                          </div>
                        </div>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Accessories
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage dynamic product accessories, branding, badges, and kit
              extras.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadAccessories}
              disabled={loadingAccessories}
            >
              Refresh
            </Button>

            <Button
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

        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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