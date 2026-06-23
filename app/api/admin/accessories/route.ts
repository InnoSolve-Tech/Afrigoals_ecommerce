import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function GET() {
  const res = await authedFetch("/admin/accessories");
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const res = await authedFetch("/admin/accessories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await req.text(),
  });

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}