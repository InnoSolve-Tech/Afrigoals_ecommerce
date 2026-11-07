import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const response = await authedFetch(
    `/admin/orders/${encodeURIComponent(id)}/assign-rider`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
