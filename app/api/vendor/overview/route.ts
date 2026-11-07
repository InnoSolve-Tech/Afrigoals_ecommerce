import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export async function GET() {
  const response = await authedFetch("/vendor/overview");
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
