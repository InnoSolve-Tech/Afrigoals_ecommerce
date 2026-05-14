import { buildMetadata } from "@/lib/seo";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = buildMetadata({
  title: "Checkout",
  description: "Complete your purchase",
  path: "/checkout",
  index: false,
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
