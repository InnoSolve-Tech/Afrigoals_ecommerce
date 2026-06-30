"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { ApiProduct } from "@/lib/api/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type UploadResult = { url: string; key: string };

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
};

type ProductVariant = {
  size?: string;
  color?: string;
  stock: number;
};

type StockMode = "total" | "size" | "color" | "size_color";

type FlexibleApiProduct = ApiProduct & {
  category?: string;
  sport?: string;
  sportCategory?: string;
  sport_category?: string;
  isFeatured?: boolean;
  is_featured?: boolean;
  variants?: ProductVariant[];
};

const PRODUCT_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "jerseys", label: "Jerseys" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
  { value: "training", label: "Training" },
  { value: "gym", label: "Gym" },
  { value: "merchandise", label: "Merchandise" },
] as const;

const SPORT_CATEGORIES = [
  { value: "football", label: "Football" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "running", label: "Running" },
  { value: "cricket", label: "Cricket" },
  { value: "rugby", label: "Rugby" },
  { value: "volleyball", label: "Volleyball" },
  { value: "gym", label: "Gym" },
] as const;

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProductVariants(product?: FlexibleApiProduct | null): ProductVariant[] {
  const raw = product?.variants;

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any) => ({
      size: String(item.size || "").trim() || undefined,
      color: String(item.color || item.colour || "").trim() || undefined,
      stock: Number(item.stock || item.qty || item.quantity || 0),
    }))
    .filter((item) => item.stock > 0 && (item.size || item.color));
}

function inferStockMode(variants: ProductVariant[]): StockMode {
  const hasSize = variants.some((item) => Boolean(item.size));
  const hasColor = variants.some((item) => Boolean(item.color));

  if (hasSize && hasColor) return "size_color";
  if (hasSize) return "size";
  if (hasColor) return "color";

  return "total";
}

function emptyVariantForMode(mode: StockMode): ProductVariant {
  return {
    size: mode === "size" || mode === "size_color" ? "" : undefined,
    color: mode === "color" || mode === "size_color" ? "" : undefined,
    stock: 0,
  };
}

function cleanVariantsForMode(mode: StockMode, variants: ProductVariant[]) {
  if (mode === "total") return [];

  return variants
    .map((item) => ({
      size:
        mode === "size" || mode === "size_color"
          ? String(item.size || "").trim()
          : undefined,
      color:
        mode === "color" || mode === "size_color"
          ? String(item.color || "").trim()
          : undefined,
      stock: Math.max(0, Number(item.stock || 0)),
    }))
    .filter((item) => {
      if (item.stock <= 0) return false;
      if (mode === "size") return Boolean(item.size);
      if (mode === "color") return Boolean(item.color);
      return Boolean(item.size) && Boolean(item.color);
    });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  product?: ApiProduct | null;
  onSaved: () => Promise<void> | void;
};

export function ProductUpsertDialog({
  open,
  onOpenChange,
  mode,
  product,
  onSaved,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pendingIdRef = useRef(0);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [sport, setSport] = useState("football");
  const [isFeatured, setIsFeatured] = useState(false);
  const [currency, setCurrency] = useState("UGX");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [stockMode, setStockMode] = useState<StockMode>("total");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const priceNumber = useMemo(
    () => Number(price.replaceAll(",", "")) || 0,
    [price],
  );

  const stockNumber = useMemo(
    () => Number(stock.replaceAll(",", "")) || 0,
    [stock],
  );

  const validVariants = useMemo(
    () => cleanVariantsForMode(stockMode, variants),
    [stockMode, variants],
  );

  const variantStockTotal = useMemo(
    () => validVariants.reduce((total, item) => total + Number(item.stock || 0), 0),
    [validVariants],
  );

  const finalStock = stockMode === "total" ? Math.max(0, stockNumber) : variantStockTotal;

  useEffect(() => {
    if (!open) return;

    setError(null);
    setSaving(false);
    setUploading(false);
    setPendingFiles((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });

    if (mode === "edit" && product) {
      const flexibleProduct = product as FlexibleApiProduct;
      const existingVariants = normalizeProductVariants(flexibleProduct);
      const nextStockMode = inferStockMode(existingVariants);

      setName(flexibleProduct.name ?? "");
      setSlug(flexibleProduct.slug ?? "");
      setDescription(flexibleProduct.description ?? "");
      setCategory(String(flexibleProduct.category || "general"));
      setSport(
        String(
          flexibleProduct.sport ||
            flexibleProduct.sportCategory ||
            flexibleProduct.sport_category ||
            "football",
        ),
      );
      setIsFeatured(Boolean(flexibleProduct.isFeatured ?? flexibleProduct.is_featured));
      setCurrency((flexibleProduct.currency || "UGX").toUpperCase());
      setPrice(String(flexibleProduct.price ?? 0));
      setStock(String(flexibleProduct.stock ?? 0));
      setStockMode(nextStockMode);
      setVariants(existingVariants);
      setImages(flexibleProduct.images ?? []);
      setImageUrl("");
      return;
    }

    setName("");
    setSlug("");
    setDescription("");
    setCategory("general");
    setSport("football");
    setIsFeatured(false);
    setCurrency("UGX");
    setPrice("0");
    setStock("0");
    setStockMode("total");
    setVariants([]);
    setImages([]);
    setImageUrl("");
  }, [open, mode, product]);

  useEffect(() => {
    if (open) return;

    setPendingFiles((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });
  }, [open]);

  function onStockModeChange(nextMode: StockMode) {
    setStockMode(nextMode);
    setError(null);

    if (nextMode === "total") {
      return;
    }

    setVariants((current) => {
      if (current.length > 0) {
        return current.map((item) => ({
          size: nextMode === "size" || nextMode === "size_color" ? item.size || "" : undefined,
          color: nextMode === "color" || nextMode === "size_color" ? item.color || "" : undefined,
          stock: Number(item.stock || 0),
        }));
      }

      return [emptyVariantForMode(nextMode)];
    });
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function getStandardSizeStock(size: string) {
    const found = variants.find(
      (item) => String(item.size || "").toUpperCase() === size.toUpperCase(),
    );

    return found ? String(found.stock || "") : "";
  }

  function setStandardSizeStock(size: string, value: string) {
    const nextStock = Math.max(0, Number(value.replaceAll(",", "")) || 0);

    setVariants((current) => {
      const existingIndex = current.findIndex(
        (item) => String(item.size || "").toUpperCase() === size.toUpperCase(),
      );

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? {
                size,
                color: undefined,
                stock: nextStock,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          size,
          color: undefined,
          stock: nextStock,
        },
      ];
    });
  }

  function addVariant() {
    setVariants((current) => [...current, emptyVariantForMode(stockMode)]);
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const next: PendingFile[] = [];
    for (const file of Array.from(files)) {
      const previewUrl = URL.createObjectURL(file);
      const id = `pending_${Date.now()}_${pendingIdRef.current++}`;
      next.push({ id, file, previewUrl });
    }
    setPendingFiles((prev) => [...prev, ...next]);
  }

  function removePending(id: string) {
    setPendingFiles((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function addImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setImageUrl("");
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function uploadPendingFiles(): Promise<string[] | null> {
    if (pendingFiles.length === 0) return [];

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const pending of pendingFiles) {
        const fd = new FormData();
        fd.append("file", pending.file);
        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as UploadResult | null;
        if (!res.ok || !data?.url) {
          setError((data as any)?.error || "Upload failed");
          return null;
        }
        uploadedUrls.push(data.url);
      }
      return uploadedUrls;
    } catch {
      setError("Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (stockMode !== "total" && validVariants.length === 0) {
      setError("Add at least one valid variant with stock.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const uploadedUrls = await uploadPendingFiles();
      if (uploadedUrls == null) return;

      const finalImages = [...images, ...uploadedUrls];
      if (finalImages.length === 0) {
        setError("Please add at least one product image.");
        return;
      }

      const finalSlug = slug.trim() || slugify(name);

      const payload = {
        name: name.trim(),
        slug: finalSlug,
        description: description.trim(),
        category,
        sport,
        isFeatured,
        currency: currency.trim(),
        price: priceNumber,
        images: finalImages,
        stock: finalStock,
        variants: validVariants,
      };

      const res =
        mode === "edit" && product?.id
          ? await fetch(`/api/admin/products/${product.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/admin/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as any)?.error || "Save failed");
        return;
      }

      setPendingFiles((prev) => {
        for (const p of prev) URL.revokeObjectURL(p.previewUrl);
        return [];
      });

      await onSaved();
      onOpenChange(false);
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "edit" ? "Edit product" : "New product";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (mode === "create" && !slug.trim()) {
                  setSlug(slugify(next));
                }
              }}
              placeholder="e.g., Uganda Cranes Jersey"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-slug">Slug</Label>
            <Input
              id="product-slug"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="e.g., uganda-cranes-jersey"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Used for the product URL. Leave blank to auto-generate.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this product?"
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="product-category">Category</Label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {PRODUCT_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-sport">Sport</Label>
              <select
                id="product-sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {SPORT_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Featured product
              </span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="product-currency">Currency</Label>
              <Input
                id="product-currency"
                value={currency}
                onChange={(e) =>
                  setCurrency(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, "")
                      .slice(0, 3),
                  )
                }
                placeholder="UGX"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-price">Price</Label>
              <Input
                id="product-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50000"
                inputMode="decimal"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Preview: {formatPrice(priceNumber, currency)}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="product-stock-mode">Stock tracking</Label>
              <select
                id="product-stock-mode"
                value={stockMode}
                onChange={(e) => onStockModeChange(e.target.value as StockMode)}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="total">Total stock only</option>
                <option value="size">Stock by standard sizes</option>
                <option value="color">Stock by colour</option>
                <option value="size_color">Stock by size and colour</option>
              </select>
            </div>
          </div>

          {stockMode === "total" ? (
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="product-stock">Total stock</Label>
              <Input
                id="product-stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          ) : stockMode === "size" ? (
            <div className="grid gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div>
                <Label>Standard size stock</Label>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Fill the number of pieces available for each size. Leave unused
                  sizes empty or zero.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {STANDARD_SIZES.map((size) => (
                  <div key={size} className="grid gap-1">
                    <Label htmlFor={`product-size-${size}`}>{size}</Label>
                    <Input
                      id={`product-size-${size}`}
                      value={getStandardSizeStock(size)}
                      onChange={(e) => setStandardSizeStock(size, e.target.value)}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Total size stock:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {variantStockTotal}
                </span>
              </p>
            </div>
          ) : (
            <div className="grid gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label>
                    {stockMode === "color"
                      ? "Colour stock"
                      : "Size and colour variants"}
                  </Label>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {stockMode === "color"
                      ? "Record each colour and how many pieces are available for that colour."
                      : "Record each size and colour combination with the available quantity."}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  {stockMode === "color" ? "Add colour" : "Add variant"}
                </Button>
              </div>

              <div className="grid gap-2">
                {variants.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-900 sm:grid-cols-[1fr_1fr_120px_auto]"
                  >
                    {stockMode === "size_color" ? (
                      <Input
                        value={item.size || ""}
                        onChange={(e) => updateVariant(index, { size: e.target.value })}
                        placeholder="Size e.g. S, M, L, XL"
                      />
                    ) : (
                      <div className="hidden sm:block" />
                    )}

                    {(stockMode === "color" || stockMode === "size_color") ? (
                      <Input
                        value={item.color || ""}
                        onChange={(e) => updateVariant(index, { color: e.target.value })}
                        placeholder="Colour e.g. Blue"
                      />
                    ) : (
                      <div className="hidden sm:block" />
                    )}

                    <Input
                      value={String(item.stock ?? 0)}
                      onChange={(e) =>
                        updateVariant(index, {
                          stock: Number(e.target.value.replaceAll(",", "")) || 0,
                        })
                      }
                      placeholder="Qty"
                      inputMode="numeric"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      disabled={variants.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Total variant stock:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {variantStockTotal}
                </span>
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Images</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
                disabled={uploading || saving}
              />
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL"
                  disabled={uploading || saving}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addImageUrl}
                  disabled={!imageUrl.trim() || uploading || saving}
                >
                  Add
                </Button>
              </div>
            </div>

            {images.length > 0 || pendingFiles.length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
                {images.map((url) => (
                  <div
                    key={url}
                    className="group relative aspect-square overflow-hidden rounded-md border"
                  >
                    <Image
                      src={url}
                      alt="Product"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {pendingFiles.map((p) => (
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-md border"
                  >
                    <img
                      src={p.previewUrl}
                      alt={p.file.name || "Pending upload"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute left-1 top-1 rounded bg-amber-500/80 px-2 py-1 text-[10px] font-medium text-white">
                      Pending
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(p.id)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add at least one image for the store carousel/product page.
              </p>
            )}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={saving || uploading || !name.trim()}
          >
            {uploading
              ? "Uploading..."
              : saving
                ? "Saving..."
                : mode === "edit"
                  ? "Save changes"
                  : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
