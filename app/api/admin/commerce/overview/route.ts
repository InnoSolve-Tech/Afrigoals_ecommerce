import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export const maxDuration = 120;
export async function GET() {
  const response = await authedFetch("/admin/commerce/overview");
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
