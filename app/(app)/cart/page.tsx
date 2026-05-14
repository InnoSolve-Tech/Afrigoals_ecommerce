import { CartPageClient } from "@/components/app/CartPageClient";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Cart",
  description: "Review the items in your Afrigoals cart before checkout.",
  path: "/cart",
  index: false,
});

export default function CartPage() {
  return <CartPageClient />;
}
