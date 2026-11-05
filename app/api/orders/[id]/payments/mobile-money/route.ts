import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

// Customer endpoints: initiate a collection (POST) and read the latest attempt (GET).
// The browser never talks to ioTec. All provider calls happen in the Go API.

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const res = await authedFetch(
    `/orders/${encodeURIComponent(id)}/payments/mobile-money`,
  );
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const res = await authedFetch(
    `/orders/${encodeURIComponent(id)}/payments/mobile-money`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await req.text(),
    },
  );
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
