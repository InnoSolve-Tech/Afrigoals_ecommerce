"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import type { CartItemAccessory } from "@/lib/api/types";
import { calculateDeliveryFee } from "@/lib/delivery/calculate-delivery-fee";

type CartItem = {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  accessories?: CartItemAccessory[];

  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
};

type DeliveryInput = {
  address: string;
  lat: number;
  lng: number;

  contactName: string;
  contactPhone: string;
  altPhone?: string;
  note?: string;
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

function getApiBaseUrl() {
  const raw =
    process.env.AFRIGOALS_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080";

  return raw.replace(/\/+$/, "");
}

function cleanPhone(value: string | undefined): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

function cleanText(value?: string | null): string {
  return String(value || "").trim();
}

function nullableText(value?: string | null): string | null {
  const cleaned = cleanText(value);
  return cleaned.length > 0 ? cleaned : null;
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
  if (!Array.isArray(accessories)) {
    return [];
  }

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

function validateCartItems(items: CartItem[]): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return "Your cart is empty.";
  }

  for (const item of items) {
    if (!item.productId?.trim()) {
      return "Invalid cart item.";
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return "Invalid cart quantity.";
    }

    const accessories = cleanAccessories(item.accessories);

    for (const accessory of accessories) {
      if (!accessory.accessoryId) {
        return "Invalid accessory selected.";
      }

      if (!Number.isInteger(accessory.quantity) || accessory.quantity <= 0) {
        return "Invalid accessory quantity.";
      }
    }
  }

  return null;
}

function buildCheckoutItem(item: CartItem) {
  const variantKey = nullableText(item.variantKey);
  const selectedSize = nullableText(item.selectedSize);
  const selectedColor = nullableText(item.selectedColor);

  return {
    productId: item.productId.trim(),
    slug: nullableText(item.slug),
    name: cleanText(item.name),
    quantity: item.quantity,
    price: Number(item.price || 0),

    variantKey,
    selectedSize,
    selectedColor,

    size: selectedSize,
    color: selectedColor,
    variant: {
      key: variantKey,
      size: selectedSize,
      color: selectedColor,
    },

    accessories: cleanAccessories(item.accessories),
  };
}

export async function createCheckoutSession(
  items: CartItem[],
  delivery: DeliveryInput,
): Promise<CheckoutResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return {
        success: false,
        error: "Please sign in before checkout.",
      };
    }

    const cartError = validateCartItems(items);

    if (cartError) {
      return {
        success: false,
        error: cartError,
      };
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

    const quote = await calculateDeliveryFee(delivery.lat, delivery.lng);
    const apiBaseUrl = getApiBaseUrl();

    const payload = {
      items: items.map(buildCheckoutItem),

      delivery: {
        address,
        lat: delivery.lat,
        lng: delivery.lng,
        fee: quote.fee,
        distanceKm: quote.distanceKm,

        contactName,
        contactPhone,
        altPhone,
        note,
      },
    };

    console.log("PESAPAL CHECKOUT PAYLOAD", JSON.stringify(payload, null, 2));

    const res = await fetch(`${apiBaseUrl}/orders/checkout/pesapal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
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
          `Payment initialization failed. Status ${res.status}`,
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