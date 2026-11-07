import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await authedFetch(
    `/admin/email-campaigns/${encodeURIComponent(id)}/deliveries`,
  );
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
