"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type DeliveryDetails = {
  address: string;
  lat: number;
  lng: number;
  fee: number;
  distanceKm: number;
};

type CreateCodOrderResult = {
  success: boolean;
  error?: string;
  url?: string;
};

type ApiOrderResponse = {
  id?: string;
  ID?: string;
  orderNumber?: string;
  error?: string;
  message?: string;
};

function getApiBaseUrl() {
  const raw =
    process.env.AFRIGOALS_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080/api/v1";

  const cleaned = raw.replace(/\/+$/, "");

  if (cleaned.endsWith("/api/v1")) {
    return cleaned;
  }

  return `${cleaned}/api/v1`;
}

export async function createCashOnDeliveryOrder(
  items: CartItem[],
  delivery: DeliveryDetails,
): Promise<CreateCodOrderResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return {
        success: false,
        error: "Please sign in to place an order.",
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

    const apiBaseUrl = getApiBaseUrl();

    const res = await fetch(`${apiBaseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddress: delivery.address,
        deliveryLat: delivery.lat,
        deliveryLng: delivery.lng,
        deliveryFee: delivery.fee,
        deliveryDistanceKm: delivery.distanceKm,
        paymentMethod: "cod",
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as ApiOrderResponse;

    if (!res.ok) {
      return {
        success: false,
        error:
          data.error ||
          data.message ||
          `Failed to create order. Status ${res.status}`,
      };
    }

    const orderId = data.id || data.ID;

    return {
      success: true,
      url: orderId ? `/orders/${orderId}` : "/orders",
    };
  } catch (error) {
    console.error("createCashOnDeliveryOrder error:", error);

    return {
      success: false,
      error: "Unexpected error while creating cash on delivery order.",
    };
  }
}