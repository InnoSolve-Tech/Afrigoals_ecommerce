import { NextRequest, NextResponse } from "next/server";

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL;

  if (!raw) {
    throw new Error("NEXT_PUBLIC_API_URL is missing");
  }

  const cleaned = raw.replace(/\/+$/, "");

  if (!cleaned.endsWith("/api/v1")) {
    throw new Error("NEXT_PUBLIC_API_URL must end with /api/v1");
  }

  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ reviews: [] }, { status: 200 });
    }

    const apiBaseUrl = getApiBaseUrl();

    const res = await fetch(
      `${apiBaseUrl}/reviews?productId=${encodeURIComponent(productId)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Failed to fetch reviews" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { reviews: [] }, { status: 200 });
  } catch (error) {
    console.error("GET /api/reviews proxy failed:", error);

    return NextResponse.json(
      { error: "Backend unavailable", reviews: [] },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { productId, name, rating, comment } = body;

    if (!productId || !name || !rating || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const apiBaseUrl = getApiBaseUrl();

    const res = await fetch(`${apiBaseUrl}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        name,
        rating,
        comment,
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Failed to create review" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { success: true }, {
      status: res.status,
    });
  } catch (error) {
    console.error("POST /api/reviews proxy failed:", error);

    return NextResponse.json(
      { error: "Backend unavailable" },
      { status: 500 },
    );
  }
}