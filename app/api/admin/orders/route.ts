import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await authedFetch(`/admin/orders${qs}`);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
