import { NextResponse } from "next/server";
import { riderFetch } from "@/lib/api/rider-proxy";
export async function GET() {
  const r = await riderFetch("/rider/orders");
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
