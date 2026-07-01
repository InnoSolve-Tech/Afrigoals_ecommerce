import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { CartItemAccessory } from "../api/types";

export interface CartItem {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  accessories?: CartItemAccessory[];

  /**
   * Variant fields.
   * These allow the basket/order to know the exact size/colour selected.
   */
  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

export interface CartActions {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;

  removeItem: (
    productId: string,
    variantKey?: string | null,
    selectedSize?: string | null,
    selectedColor?: string | null,
  ) => void;

  updateQuantity: (
    productId: string,
    quantity: number,
    variantKey?: string | null,
    selectedSize?: string | null,
    selectedColor?: string | null,
  ) => void;

  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export type CartStore = CartState & CartActions;

export const defaultInitState: CartState = {
  items: [],
  isOpen: false,
};

function normalizeCartValue(value?: string | null) {
  return String(value || "").trim();
}

export function getCartItemKey(item: {
  productId: string;
  variantKey?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
}) {
  return [
    normalizeCartValue(item.productId),
    normalizeCartValue(item.variantKey),
    normalizeCartValue(item.selectedSize),
    normalizeCartValue(item.selectedColor),
  ].join("::");
}

function sameCartLine(
  item: CartItem,
  productId: string,
  variantKey?: string | null,
  selectedSize?: string | null,
  selectedColor?: string | null,
) {
  return (
    item.productId === productId &&
    normalizeCartValue(item.variantKey) === normalizeCartValue(variantKey) &&
    normalizeCartValue(item.selectedSize) === normalizeCartValue(selectedSize) &&
    normalizeCartValue(item.selectedColor) === normalizeCartValue(selectedColor)
  );
}

export const createCartStore = (initState: CartState = defaultInitState) => {
  return createStore<CartStore>()(
    persist(
      (set) => ({
        ...initState,

        addItem: (item, quantity = 1) =>
          set((state) => {
            const normalizedItem: Omit<CartItem, "quantity"> = {
              ...item,
              variantKey: item.variantKey ?? null,
              selectedSize: item.selectedSize ?? null,
              selectedColor: item.selectedColor ?? null,
            };

            const existingItem = state.items.find((current) =>
              sameCartLine(
                current,
                normalizedItem.productId,
                normalizedItem.variantKey,
                normalizedItem.selectedSize,
                normalizedItem.selectedColor,
              ),
            );

            if (existingItem) {
              return {
                items: state.items.map((current) =>
                  sameCartLine(
                    current,
                    normalizedItem.productId,
                    normalizedItem.variantKey,
                    normalizedItem.selectedSize,
                    normalizedItem.selectedColor,
                  )
                    ? {
                        ...current,
                        quantity: current.quantity + quantity,
                        accessories:
                          normalizedItem.accessories ?? current.accessories,
                      }
                    : current,
                ),
                isOpen: true,
              };
            }

            return {
              items: [
                ...state.items,
                {
                  ...normalizedItem,
                  quantity,
                },
              ],
              isOpen: true,
            };
          }),

        removeItem: (productId, variantKey, selectedSize, selectedColor) =>
          set((state) => ({
            items: state.items.filter(
              (item) =>
                !sameCartLine(
                  item,
                  productId,
                  variantKey,
                  selectedSize,
                  selectedColor,
                ),
            ),
          })),

        updateQuantity: (
          productId,
          quantity,
          variantKey,
          selectedSize,
          selectedColor,
        ) =>
          set((state) => {
            if (quantity <= 0) {
              return {
                items: state.items.filter(
                  (item) =>
                    !sameCartLine(
                      item,
                      productId,
                      variantKey,
                      selectedSize,
                      selectedColor,
                    ),
                ),
              };
            }

            return {
              items: state.items.map((item) =>
                sameCartLine(
                  item,
                  productId,
                  variantKey,
                  selectedSize,
                  selectedColor,
                )
                  ? {
                      ...item,
                      quantity,
                    }
                  : item,
              ),
            };
          }),

        clearCart: () =>
          set({
            items: [],
            isOpen: false,
          }),

        toggleCart: () =>
          set((state) => ({
            isOpen: !state.isOpen,
          })),

        openCart: () =>
          set({
            isOpen: true,
          }),

        closeCart: () =>
          set({
            isOpen: false,
          }),
      }),
      {
        name: "afrigoals-cart",
      },
    ),
  );
};