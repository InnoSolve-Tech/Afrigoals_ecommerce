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

export type ApiOrderItemAccessory = {
  accessoryId: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  text?: string;
  number?: string;
  notes?: string;
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

  accessoriesJson?: string;
  accessoriesFee?: number;
  lineSubtotal?: number;

  createdAt?: string;
  updatedAt?: string;
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
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  deliveryAltPhone?: string;
  deliveryNote?: string;
};


export type ApiProductAccessory = {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  appliesToCategory?: string;
  isBranding: boolean;
  requiresText: boolean;
  requiresNumber: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiProductAccessoryLink = {
  id: string;
  productId: string;
  accessoryId: string;
  isRequired: boolean;
  sortOrder: number;
  accessory: ApiProductAccessory;
};

export type CartItemAccessory = {
  accessoryId: string;
  quantity: number;
  text?: string;
  number?: string;
  notes?: string;

  name?: string;
  code?: string;
  unitPrice?: number;
};