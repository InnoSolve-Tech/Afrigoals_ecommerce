import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductGallery } from "@/components/app/ProductGallery";
import { ProductGrid } from "@/components/app/ProductGrid";
import { ProductInfo } from "@/components/app/ProductInfo";
import {
  getCatalogProductBySlug,
  queryCatalogProducts,
} from "@/lib/catalog/query";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const getProduct = cache(async (slug: string) => getCatalogProductBySlug(slug));

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return buildMetadata({
      title: "Product Not Found",
      description: "The requested Afrigoals product could not be found.",
      path: "/products",
      index: false,
    });
  }

  return buildMetadata({
    title: product.name,
    description:
      product.description ||
      `Buy ${product.name} at Afrigoals. View pricing, images, and availability.`,
    path: `/products/${product.slug}`,
    type: "article",
    image: product.images[0] || undefined,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = (
    await queryCatalogProducts({
      categorySlug: product.category?.slug ?? "",
    })
  )
    .filter((item) => item._id !== product._id)
    .slice(0, 4);
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description ||
      `Shop ${product.name} at Afrigoals for sports attire and equipment.`,
    image: product.images,
    category: product.category?.title,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: product.currency.toUpperCase(),
      price: product.price,
      availability: `https://schema.org/${
        product.stock > 0 ? "InStock" : "OutOfStock"
      }`,
    },
  };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: absoluteUrl("/products"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };
  const serializedProductStructuredData = JSON.stringify(
    productStructuredData,
  ).replace(/</g, "\\u003c");
  const serializedBreadcrumbStructuredData = JSON.stringify(
    breadcrumbStructuredData,
  ).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <script type="application/ld+json">
        {serializedProductStructuredData}
      </script>
      <script type="application/ld+json">
        {serializedBreadcrumbStructuredData}
      </script>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Link
          href="/products"
          className="mb-8 inline-flex items-center gap-2 font-semibold text-primary transition hover:text-primary/80"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Products
        </Link>

        <div className="mb-12 grid gap-8 lg:grid-cols-2">
          <ProductGallery images={product.images} productName={product.name} />
          <ProductInfo product={product} />
        </div>

        {relatedProducts.length > 0 && (
          <section className="border-t border-gray-200 py-12 dark:border-gray-700">
            <h2 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">
              Related Products
            </h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}
      </div>
    </div>
  );
}
