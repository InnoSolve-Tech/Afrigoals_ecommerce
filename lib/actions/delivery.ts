"use server";

import { calculateDeliveryFee } from "@/lib/delivery/calculate-delivery-fee";

interface DeliveryQuoteInput {
  lat: number;
  lng: number;
}

export interface DeliveryQuoteResult {
  success: boolean;
  fee?: number;
  distanceKm?: number;
  distanceMeters?: number;
  currency?: "UGX";
  error?: string;
}

export async function getDeliveryQuote(
  input: DeliveryQuoteInput,
): Promise<DeliveryQuoteResult> {
  try {
    if (
      typeof input.lat !== "number" ||
      Number.isNaN(input.lat) ||
      typeof input.lng !== "number" ||
      Number.isNaN(input.lng)
    ) {
      return {
        success: false,
        error: "Invalid delivery coordinates",
      };
    }

    const quote = await calculateDeliveryFee(input.lat, input.lng);

    return {
      success: true,
      fee: quote.fee,
      distanceKm: quote.distanceKm,
      distanceMeters: quote.distanceMeters,
      currency: quote.currency,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to calculate delivery";

    return {
      success: false,
      error: message,
    };
  }
}