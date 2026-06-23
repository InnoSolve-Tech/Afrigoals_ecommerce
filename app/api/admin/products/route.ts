import { NextResponse } from "next/server";
import { authedFetch } from "@/lib/api/proxy";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = url.searchParams.get("q");
  const ids = url.searchParams.get("ids");
  const category = url.searchParams.get("category");
  const sport = url.searchParams.get("sport");
  const featured = url.searchParams.get("featured");

  const qs = new URLSearchParams();

  if (q) qs.set("q", q);
  if (ids) qs.set("ids", ids);
  if (category) qs.set("category", category);
  if (sport) qs.set("sport", sport);
  if (featured) qs.set("featured", featured);

  const res = await authedFetch(
    `/products${qs.toString() ? `?${qs}` : ""}`,
  );

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const res = await authedFetch("/products", {
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