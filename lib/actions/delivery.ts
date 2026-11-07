"use server";

import { getBackendApiBaseUrl } from "@/lib/api/backend";

export interface DeliveryQuoteResult {
  success: boolean;
  fee?: number;
  distanceKm?: number;
  distanceMeters?: number;
  currency?: "UGX";
  error?: string;
}

export async function getDeliveryQuote(input: {
  lat: number;
  lng: number;
}): Promise<DeliveryQuoteResult> {
  if (
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng) ||
    Math.abs(input.lat) > 90 ||
    Math.abs(input.lng) > 180
  ) {
    return { success: false, error: "Invalid delivery coordinates" };
  }
  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/delivery/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok)
      return {
        success: false,
        error: data.error || "Could not calculate delivery",
      };
    if (
      !Number.isFinite(data.fee) ||
      data.fee < 0 ||
      !Number.isFinite(data.distanceKm)
    ) {
      return { success: false, error: "Invalid delivery quote" };
    }
    return {
      success: true,
      fee: data.fee,
      distanceKm: data.distanceKm,
      distanceMeters: data.distanceMeters,
      currency: "UGX",
    };
  } catch {
    return {
      success: false,
      error: "Delivery pricing is temporarily unavailable. Please try again.",
    };
  }
}
