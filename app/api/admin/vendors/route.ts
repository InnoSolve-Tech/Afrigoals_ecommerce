import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export async function GET() {
  const response = await authedFetch("/admin/vendors");
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export async function POST(request: Request) {
  const response = await authedFetch("/admin/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
