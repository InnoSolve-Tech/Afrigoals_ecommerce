import {
  ArrowRight,
  Package,
  Shield,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CategoryTiles } from "@/components/app/CategoryTiles";
import { ProductGrid } from "@/components/app/ProductGrid";
import {
  getCatalogCategories,
  getCatalogFeaturedProducts,
  queryCatalogProducts,
} from "@/lib/catalog/query";

const sports = [
  { name: "Football", icon: "⚽" },
  { name: "Basketball", icon: "🏀" },
  { name: "Tennis", icon: "🎾" },
  { name: "Running", icon: "🏃" },
  { name: "Cricket", icon: "🏏" },
  { name: "Rugby", icon: "🏉" },
  { name: "Volleyball", icon: "🏐" },
  { name: "Gym", icon: "💪" },
];

function getProductHref(product: { slug?: string | null } | null | undefined) {
  return product?.slug ? `/products/${product.slug}` : "/products";
}

export default async function HomePage() {
  const categories = getCatalogCategories();
  const productList = await queryCatalogProducts({});
  const featuredProductCards = await getCatalogFeaturedProducts();
  const featuredIds = new Set(
    featuredProductCards.map((product) => product._id),
  );
  const fallbackProductCards = productList.filter(
    (product) => !featuredIds.has(product._id),
  );
  const visibleProducts = [
    ...featuredProductCards,
    ...fallbackProductCards,
  ].slice(0, 8);
  const heroProduct = visibleProducts[0] ?? null;
  const heroImage = heroProduct?.images?.[0] ?? null;
  const inStockCount = productList.filter(
    (product) => product.stock > 0,
  ).length;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <section className="overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5 py-10 dark:from-primary/20 dark:to-primary/10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_560px] lg:gap-10">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm dark:bg-gray-800">
                Featured Pick
              </span>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Shop with us for better quality and best prices for sports gear
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-300 md:text-lg">
                Get quality sports gear from trusted vendors across Africa.
                Jerseys, shoes, gloves, caps and more for every sport.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Start Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {heroProduct ? (
                  <Link
                    href={getProductHref(heroProduct)}
                    className="inline-flex items-center rounded-lg border border-primary/20 bg-white px-5 py-3 font-semibold text-primary transition hover:bg-primary/5 dark:bg-gray-900"
                  >
                    View Featured Product
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 top-6 h-40 w-40 rounded-full bg-white/45 blur-3xl" />
              <div className="absolute bottom-2 left-2 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

              <Link href={getProductHref(heroProduct)} className="group block">
                <div className="relative min-h-[420px] overflow-hidden lg:min-h-[500px]">
                  <div className="absolute inset-x-10 bottom-8 h-14 rounded-full bg-black/10 blur-2xl dark:bg-black/20" />

                  {heroImage ? (
                    <Image
                      src={heroImage}
                      alt={heroProduct?.name ?? "Featured product"}
                      fill
                      className="object-contain object-center transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 1024px) 100vw, 560px"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary">
                      <Package className="h-14 w-14" />
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">
                {productList.length}+
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Products
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">
                {categories.length}+
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Categories
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">4.8/5</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg Rating
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">{inStockCount}+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                In Stock
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
              Shop by Category
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Find exactly what you need
            </p>
          </div>
        </div>
        <CategoryTiles categories={categories} />
      </section>

      <section className="bg-gray-50 py-12 dark:bg-gray-800/50 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
              Shop by Sport
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Explore gear for your favorite sports
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {sports.map((sport) => (
              <Link
                key={sport.name}
                href={`/products?q=${encodeURIComponent(sport.name)}`}
                className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-center transition-all hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="mb-2 text-3xl">{sport.icon}</span>
                <span className="text-xs font-semibold text-foreground sm:text-sm">
                  {sport.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
                Featured Products
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Best sellers and newest arrivals
              </p>
            </div>
            <Link
              href="/products"
              className="hidden font-semibold text-primary transition hover:text-primary/80 sm:block"
            >
              View All
            </Link>
          </div>

          <ProductGrid products={visibleProducts} />

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/products"
              className="inline-flex rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-12 dark:bg-gray-800/50 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold text-foreground md:text-3xl">
            Why Choose Afrigoals
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Trusted Vendors",
                text: "Buy from verified sellers with excellent ratings and reviews.",
                icon: Shield,
              },
              {
                title: "Fast Delivery",
                text: "Quick and reliable shipping to your doorstep.",
                icon: Zap,
              },
              {
                title: "Best Prices",
                text: "Competitive pricing with regular discounts and deals.",
                icon: TrendingUp,
              },
              {
                title: "Quality Guaranteed",
                text: "Authentic products from reputable sports brands.",
                icon: Star,
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-lg bg-[linear-gradient(90deg,#0300d3_0%,#4956bf_38%,#958aa7_70%,#d1a07f_100%)] p-8 text-center text-white md:p-12">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Ready to Shop?
            </h2>
            <p className="mb-8 text-lg opacity-90">
              Discover sports products from trusted African vendors.
            </p>
            <Link
              href="/products"
              className="inline-flex rounded-lg bg-white px-8 py-3 font-semibold text-primary transition hover:bg-gray-100"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
