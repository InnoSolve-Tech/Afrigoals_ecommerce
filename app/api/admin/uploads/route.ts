import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function POST(req: Request) {
  const formData = await req.formData();
  const res = await authedFetch("/uploads", {
    method: "POST",
    body: formData as any,
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
