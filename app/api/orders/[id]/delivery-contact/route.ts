import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const res = await authedFetch(
    `/orders/${encodeURIComponent(id)}/delivery-contact`,
    {
      method: "PATCH",
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