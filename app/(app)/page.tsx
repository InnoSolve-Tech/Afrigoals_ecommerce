import { Shield, Star, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { CategoryTiles } from "@/components/app/CategoryTiles";
import { ProductGrid } from "@/components/app/ProductGrid";
import {
  getCatalogCategories,
  getCatalogFeaturedProducts,
  queryCatalogProducts,
} from "@/lib/catalog/query";
import { absoluteUrl, buildMetadata, siteName } from "@/lib/seo";

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

export const metadata = buildMetadata({
  title: "Premium African Sports Attire and Equipment",
  description:
    "Shop premium sports attire, shoes, and accessories from trusted African vendors at Afrigoals.",
  path: "/",
});

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
  const homeStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteName,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/brand/afrigoals-logo.png"),
      },
      {
        "@type": "WebSite",
        name: siteName,
        url: absoluteUrl("/"),
        potentialAction: {
          "@type": "SearchAction",
          target: `${absoluteUrl("/products")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
  const serializedHomeStructuredData = JSON.stringify(
    homeStructuredData,
  ).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <script type="application/ld+json">{serializedHomeStructuredData}</script>
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12 dark:from-primary/20 dark:to-primary/10 md:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
              Premium African Sports Attire
            </h1>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
              Shop quality sports gear from trusted vendors across Africa.
              Jerseys, shoes, gloves, caps and more for every sport.
            </p>
            <Link
              href="/products"
              className="inline-flex rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Start Shopping
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">
                {productList.length}+
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Products
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">
                {categories.length}+
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Categories
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">4.8/5</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Avg Rating
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 dark:bg-gray-800">
              <p className="text-2xl font-bold text-primary">Fast</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Delivery
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
