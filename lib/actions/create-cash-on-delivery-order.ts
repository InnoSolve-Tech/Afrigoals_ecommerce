"use server";

import { cookies } from "next/headers";
import { getBackendApiBaseUrl } from "@/lib/api/backend";
import type { CartItemAccessory } from "@/lib/api/types";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

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
  orderId?: string;
};

type ApiOrderResponse = {
  id?: string;
  ID?: string;
  orderId?: string;
  order_id?: string;
  orderNumber?: string;
  order_number?: string;
  order?: ApiOrderResponse;
  data?: ApiOrderResponse;
  error?: string;
  message?: string;
};

function getOrderId(data: ApiOrderResponse): string {
  const directId = data.orderId || data.order_id || data.id || data.ID;
  if (directId?.trim()) {
    return directId.trim();
  }

  if (data.order) {
    const nestedId = getOrderId(data.order);
    if (nestedId) return nestedId;
  }

  return data.data ? getOrderId(data.data) : "";
}

function getOrderNumber(data: ApiOrderResponse): string {
  const directOrderNumber = data.orderNumber || data.order_number;
  if (directOrderNumber?.trim()) {
    return directOrderNumber.trim();
  }

  if (data.order) {
    const nestedOrderNumber = getOrderNumber(data.order);
    if (nestedOrderNumber) return nestedOrderNumber;
  }

  return data.data ? getOrderNumber(data.data) : "";
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

function isValidUgandanMobilePhone(value: string): boolean {
  const phone = value.replace(/[\s().-]/g, "");
  return /^(?:\+?2567\d{8}|07\d{8}|7\d{8})$/.test(phone);
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
  paymentMethod: "cod" | "mobile_money" = "cod",
  payerPhone?: string,
  expectedTotal?: number,
): Promise<CreateCodOrderResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return {
        success: false,
        url: "/signin?next=/checkout",
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

    const cleanedPayerPhone = cleanPhone(payerPhone);
    if (
      paymentMethod === "mobile_money" &&
      !isValidUgandanMobilePhone(cleanedPayerPhone)
    ) {
      return {
        success: false,
        error: "Enter a valid Ugandan MTN or Airtel payer number.",
      };
    }

    const apiBaseUrl = getBackendApiBaseUrl();

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

      paymentMethod,
      expectedTotal,
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

    const orderId = getOrderId(data);
    const orderNumber = getOrderNumber(data);

    if (paymentMethod === "mobile_money") {
      if (!orderId) {
        return {
          success: false,
          error:
            "Order was created but the payment reference was not returned.",
        };
      }

      let paymentStartFailed = false;
      try {
        const paymentRes = await fetch(
          `${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/payments/mobile-money`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ phone: cleanedPayerPhone }),
            cache: "no-store",
          },
        );
        paymentStartFailed = !paymentRes.ok;
        if (!paymentRes.ok) {
          console.error("IOTEC payment initiation failed", {
            status: paymentRes.status,
            orderId,
          });
        }
      } catch (error) {
        paymentStartFailed = true;
        console.error("IOTEC payment initiation request failed", {
          orderId,
          error,
        });
      }

      return {
        success: true,
        orderId,
        url: `/orders/${encodeURIComponent(orderId)}/pay${
          paymentStartFailed ? "?start=failed" : ""
        }`,
      };
    }

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
      error:
        paymentMethod === "mobile_money"
          ? "Unexpected error while starting IOTEC payment."
          : "Unexpected error while creating cash on delivery order.",
    };
  }
}
