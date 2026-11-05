import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = new URLSearchParams();

  for (const key of ["from", "to"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await authedFetch(`/admin/reconciliation${suffix}`);
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
