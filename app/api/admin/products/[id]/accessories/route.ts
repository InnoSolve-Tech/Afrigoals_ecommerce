import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const res = await authedFetch(
    `/admin/products/${encodeURIComponent(id)}/accessories`,
  );

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const res = await authedFetch(
    `/admin/products/${encodeURIComponent(id)}/accessories`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: await req.text(),
    },
  );

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}