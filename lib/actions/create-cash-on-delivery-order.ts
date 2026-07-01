"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import type { CartItemAccessory } from "@/lib/api/types";

type CartItem = {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  accessories?: CartItemAccessory[];

  /**
   * Variant fields from cart-store.
   * These are required so COD orders keep size/colour selections.
   */
  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
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

function buildOrderItem(item: CartItem) {
  const variantKey = nullableText(item.variantKey);
  const selectedSize = nullableText(item.selectedSize);
  const selectedColor = nullableText(item.selectedColor);

  return {
    productId: item.productId.trim(),
    slug: nullableText(item.slug),
    name: cleanText(item.name),
    quantity: item.quantity,
    price: Number(item.price || 0),

    /**
     * Main variant fields.
     * Your Go backend should save these on each order item.
     */
    variantKey,
    selectedSize,
    selectedColor,

    /**
     * Compatibility aliases.
     * These help if your Go backend expects size/color instead of selectedSize/selectedColor.
     */
    size: selectedSize,
    color: selectedColor,
    colour: selectedColor,

    variant: {
      key: variantKey,
      size: selectedSize,
      color: selectedColor,
      colour: selectedColor,
    },

    accessories: cleanAccessories(item.accessories),
  };
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
      items: items.map(buildOrderItem),

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

    console.log("COD ORDER PAYLOAD", JSON.stringify(payload, null, 2));

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