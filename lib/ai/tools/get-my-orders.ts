import { authedFetch } from "@/lib/api/proxy";
import type { ApiOrder } from "@/lib/api/types";
import { formatPrice } from "@/lib/utils";
import { tool } from "ai";
import { z } from "zod";

const schema = z.object({
  status: z.string().optional().default(""),
});

export interface OrderSummary {
  id: string;
  orderNumber: string | null;
  total: number | null;
  totalFormatted: string | null;
  status: string | null;
  statusDisplay: string;
  itemCount: number;
  itemNames: string[];
  itemImages: string[];
  createdAt: string | null;
  orderUrl: string;
}

export interface GetMyOrdersResult {
  found: boolean;
  message: string;
  orders: OrderSummary[];
  totalOrders: number;
  isAuthenticated: boolean;
}

export async function getMyOrders(status = ""): Promise<GetMyOrdersResult> {
  const response = await authedFetch("/orders/my");
  if (response.status === 401)
    return {
      found: false,
      message: "Sign in to view your orders.",
      orders: [],
      totalOrders: 0,
      isAuthenticated: false,
    };
  if (!response.ok)
    return {
      found: false,
      message: "Order history is temporarily unavailable.",
      orders: [],
      totalOrders: 0,
      isAuthenticated: true,
    };
  const data: ApiOrder[] = await response.json();
  const orders = data
    .filter((order) => !status || order.status === status)
    .slice(0, 20)
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber ?? null,
      total: order.total ?? null,
      totalFormatted: formatPrice(order.total ?? 0),
      status: order.status ?? null,
      statusDisplay: String(order.status || "pending").replaceAll("_", " "),
      itemCount: (order.items ?? []).reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      itemNames: (order.items ?? []).map((item) => item.productName),
      itemImages: (order.items ?? [])
        .map((item) => item.imageUrl)
        .filter((url): url is string => !!url),
      createdAt: order.createdAt ?? null,
      orderUrl: `/orders/${encodeURIComponent(order.id)}`,
    }));
  return {
    found: orders.length > 0,
    message: orders.length
      ? "Your matching orders."
      : "No matching orders found.",
    orders,
    totalOrders: data.length,
    isAuthenticated: true,
  };
}
export function createGetMyOrdersTool(_userId: string | null) {
  return tool({
    description:
      "Read the signed-in customer's own orders. No account ID may be supplied.",
    inputSchema: schema,
    execute: async ({ status }) => getMyOrders(status),
  });
}
