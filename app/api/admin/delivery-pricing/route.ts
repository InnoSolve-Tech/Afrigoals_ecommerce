import { authedFetch } from "@/lib/api/proxy";
import {
  deliveryPricingProxyResponse,
  deliveryPricingUnavailable,
} from "@/lib/api/delivery-pricing-response";
export async function GET() {
  try {
    return await deliveryPricingProxyResponse(
      await authedFetch("/admin/delivery-pricing"),
    );
  } catch {
    return deliveryPricingUnavailable();
  }
}
export async function PUT(request: Request) {
  try {
    return await deliveryPricingProxyResponse(
      await authedFetch("/admin/delivery-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
      }),
    );
  } catch {
    return deliveryPricingUnavailable();
  }
}
