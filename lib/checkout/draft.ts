// Local draft of the checkout form, kept so a guest who signs in at checkout
// does not lose their delivery details. Cleared once an order is placed.

export const CHECKOUT_DRAFT_KEY = "afrigoals-checkout-draft";

export type CheckoutDraft = {
  paymentMethod?: "pesapal" | "cod" | "mobile_money";
  deliveryAddress?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  deliveryAltPhone?: string;
  deliveryNote?: string;
};

export function clearCheckoutDraft() {
  try {
    window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // Storage can be unavailable (private mode); nothing to clear then.
  }
}
