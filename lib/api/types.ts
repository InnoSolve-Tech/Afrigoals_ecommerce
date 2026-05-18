export type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  currency: string;
  price: number;
  images: string[];
  stock: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiOrderItem = {
  total: number;
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  imageUrl?: string;
  priceAtPurchase: number;
  quantity: number;
};

export type ApiOrderStatusEvent = {
  id: string;
  orderId: string;
  status: string;
  note?: string;
  createdAt: string;
};

export type ApiOrder = {
  id: string;
  orderNumber: string;
  userId: string;
  email: string;
  status: string;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  deliveryDistanceKm: number;
  paymentMethod: string;
  paidAt?: string | null;
  items: ApiOrderItem[];
  statusEvents?: ApiOrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
};
