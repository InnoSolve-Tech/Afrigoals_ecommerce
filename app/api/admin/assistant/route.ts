import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";
export const maxDuration = 120;
export async function POST(request: Request) {
  const response = await authedFetch("/admin/assistant", {
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
