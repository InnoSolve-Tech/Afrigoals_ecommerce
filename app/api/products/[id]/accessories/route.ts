import { NextResponse } from "next/server";
import { buildBackendApiUrl } from "@/lib/api/backend";

// Public catalog data: guests can view accessories and prices. The Go route
// GET /api/v1/products/:id/accessories is unauthenticated, so no cookie or
// Authorization header is forwarded here.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const productId = id.trim();

  if (!productId) {
    return NextResponse.json(
      { error: "product id is required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let res: Response;
  try {
    res = await fetch(
      buildBackendApiUrl(
        `/products/${encodeURIComponent(productId)}/accessories`,
      ),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Product accessories are temporarily unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
