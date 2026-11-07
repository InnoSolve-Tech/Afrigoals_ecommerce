import { NextResponse } from "next/server";

export async function deliveryPricingProxyResponse(response: Response) {
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    const missing = response.status === 404;
    return NextResponse.json(
      {
        error: missing
          ? "Delivery pricing is not available on the connected API. The server deployment needs to be checked."
          : "The delivery pricing server returned an unexpected response. Please try again.",
        code: missing
          ? "delivery_pricing_route_missing"
          : "invalid_upstream_response",
      },
      {
        status: response.ok ? 502 : response.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return NextResponse.json(data, {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function deliveryPricingUnavailable() {
  return NextResponse.json(
    {
      error:
        "The delivery pricing server could not be reached. Please try again.",
      code: "upstream_unavailable",
    },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}
