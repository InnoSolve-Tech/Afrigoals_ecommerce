"use server";

import { cookies } from "next/headers";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type DeliveryInput = {
  address: string;
  lat: number;
  lng: number;
  fee: number;
  distanceKm: number;
};

type CheckoutResult = {
  success: boolean;
  url?: string;
  error?: string;
};

type GoCheckoutResponse = {
  url?: string;
  redirect_url?: string;
  redirectUrl?: string;
  payment_url?: string;
  paymentUrl?: string;
  error?: string;
  message?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export async function createCheckoutSession(
  items: CartItem[],
  delivery: DeliveryInput,
): Promise<CheckoutResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return {
        success: false,
        error: "Please sign in before checkout.",
      };
    }

    if (!items.length) {
      return {
        success: false,
        error: "Your cart is empty.",
      };
    }

    if (!delivery.address.trim()) {
      return {
        success: false,
        error: "Delivery address is required.",
      };
    }

    if (
      delivery.lat == null ||
      delivery.lng == null ||
      delivery.fee == null ||
      delivery.distanceKm == null
    ) {
      return {
        success: false,
        error: "Delivery details are incomplete.",
      };
    }

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      delivery: {
        address: delivery.address,
        lat: delivery.lat,
        lng: delivery.lng,
        fee: delivery.fee,
        distanceKm: delivery.distanceKm,
      },
    };

    const res = await fetch(`${API_URL}/orders/checkout/pesapal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as GoCheckoutResponse;

    if (!res.ok) {
      return {
        success: false,
        error:
          data.error ||
          data.message ||
          `Payment initialization failed with status ${res.status}.`,
      };
    }

    const redirectUrl =
      data.url ||
      data.redirect_url ||
      data.redirectUrl ||
      data.payment_url ||
      data.paymentUrl;

    if (!redirectUrl) {
      return {
        success: false,
        error: "Payment gateway did not return a redirect URL.",
      };
    }

    return {
      success: true,
      url: redirectUrl,
    };
  } catch (error) {
    console.error("createCheckoutSession error:", error);

    return {
      success: false,
      error: "Unexpected error while starting payment.",
    };
  }
}