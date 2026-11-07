import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export async function GET() {
  const r = await authedFetch("/admin/riders");
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
