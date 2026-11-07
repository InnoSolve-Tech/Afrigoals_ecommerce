import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Pesapal has been retired. Use IOTEC mobile money or cash on delivery.",
    },
    { status: 410 },
  );
}

export const POST = GET;
