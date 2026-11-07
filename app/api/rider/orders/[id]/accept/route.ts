import { NextResponse } from "next/server";
import { riderFetch } from "@/lib/api/rider-proxy";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await riderFetch(`/rider/orders/${encodeURIComponent(id)}/accept`, {
    method: "POST",
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
