"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import type { CartItemAccessory } from "@/lib/api/types";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  accessories?: CartItemAccessory[];
};

type DeliveryDetails = {
  address: string;
  lat: number;
  lng: number;
  fee: number;
  distanceKm: number;

  contactName: string;
  contactPhone: string;
  altPhone?: string;
  note?: string;
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
  order_number?: string;
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

function cleanPhone(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(value);
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function cleanAccessories(accessories: CartItemAccessory[] | undefined) {
  if (!Array.isArray(accessories)) return [];

  return accessories
    .map((accessory) => ({
      accessoryId: String(accessory.accessoryId || "").trim(),
      quantity:
        Number.isInteger(accessory.quantity) && accessory.quantity > 0
          ? accessory.quantity
          : 1,
      text: String(accessory.text || "").trim(),
      number: String(accessory.number || "").trim(),
      notes: String(accessory.notes || "").trim(),
    }))
    .filter((accessory) => accessory.accessoryId);
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

    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: "Your cart is empty.",
      };
    }

    for (const item of items) {
      if (!item.productId?.trim()) {
        return {
          success: false,
          error: "Invalid cart item.",
        };
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return {
          success: false,
          error: "Invalid cart quantity.",
        };
      }
    }

    const address = delivery.address?.trim() || "";
    const contactName = delivery.contactName?.trim() || "";
    const contactPhone = cleanPhone(delivery.contactPhone);
    const altPhone = cleanPhone(delivery.altPhone);
    const note = delivery.note?.trim() || "";

    if (!address) {
      return {
        success: false,
        error: "Delivery address is required.",
      };
    }

    if (!isValidCoordinate(delivery.lat, delivery.lng)) {
      return {
        success: false,
        error: "Invalid delivery coordinates.",
      };
    }

    if (!Number.isFinite(delivery.fee) || delivery.fee < 0) {
      return {
        success: false,
        error: "Invalid delivery fee.",
      };
    }

    if (!Number.isFinite(delivery.distanceKm) || delivery.distanceKm < 0) {
      return {
        success: false,
        error: "Invalid delivery distance.",
      };
    }

    if (!contactName) {
      return {
        success: false,
        error: "Receiver name is required.",
      };
    }

    if (!contactPhone) {
      return {
        success: false,
        error: "Receiver phone is required.",
      };
    }

    if (!isValidPhone(contactPhone)) {
      return {
        success: false,
        error: "Receiver phone is invalid.",
      };
    }

    if (altPhone && !isValidPhone(altPhone)) {
      return {
        success: false,
        error: "Alternative phone is invalid.",
      };
    }

    const apiBaseUrl = getApiBaseUrl();

    const payload = {
      items: items.map((item) => ({
        productId: item.productId.trim(),
        quantity: item.quantity,
        accessories: cleanAccessories(item.accessories),
      })),

      deliveryAddress: address,
      deliveryLat: delivery.lat,
      deliveryLng: delivery.lng,
      deliveryFee: delivery.fee,
      deliveryDistanceKm: delivery.distanceKm,

      deliveryContactName: contactName,
      deliveryContactPhone: contactPhone,
      deliveryAltPhone: altPhone,
      deliveryNote: note,

      paymentMethod: "cod",
    };

    const res = await fetch(`${apiBaseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
    const orderNumber = data.orderNumber || data.order_number;

    return {
      success: true,
      url: orderId
        ? `/orders/${encodeURIComponent(orderId)}?payment=cod`
        : orderNumber
          ? `/orders?created=${encodeURIComponent(orderNumber)}`
          : "/orders",
    };
  } catch (error) {
    console.error("createCashOnDeliveryOrder error:", error);

    return {
      success: false,
      error: "Unexpected error while creating cash on delivery order.",
    };
  }
}