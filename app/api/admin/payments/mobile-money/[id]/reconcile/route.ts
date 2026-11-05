import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

// Manual recheck: the Go API calls ioTec's status endpoint and applies the verified result.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const res = await authedFetch(
    `/admin/payments/mobile-money/${encodeURIComponent(id)}/reconcile`,
    { method: "POST" },
  );
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
