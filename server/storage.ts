import { randomUUID } from "crypto";
import type {
  Merchant,
  GiftProduct,
  GiftOrder,
  CreateGiftOrderInput,
  GiftOrderStatusType,
} from "../shared/schema";
import { merchants as seedMerchants, giftProducts as seedProducts } from "./seed-data";

function generateRedeemCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class Storage {
  private merchants: Map<string, Merchant> = new Map();
  private products: Map<string, GiftProduct> = new Map();
  private orders: Map<string, GiftOrder> = new Map();

  constructor() {
    for (const m of seedMerchants) {
      this.merchants.set(m.id, m);
    }
    for (const p of seedProducts) {
      this.products.set(p.id, p);
    }
  }

  async getMerchants(city?: string, category?: string): Promise<Merchant[]> {
    let result = Array.from(this.merchants.values()).filter((m) => m.isActive);
    if (city) {
      result = result.filter((m) => m.city.toLowerCase() === city.toLowerCase());
    }
    if (category) {
      const merchantIds = Array.from(this.products.values())
        .filter((p) => p.category === category && p.isActive)
        .map((p) => p.merchantId);
      const uniqueIds = new Set(merchantIds);
      result = result.filter((m) => uniqueIds.has(m.id));
    }
    return result;
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    return this.merchants.get(id);
  }

  async getProducts(merchantId: string): Promise<GiftProduct[]> {
    return Array.from(this.products.values()).filter(
      (p) => p.merchantId === merchantId && p.isActive
    );
  }

  async getProduct(id: string): Promise<GiftProduct | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<GiftProduct[]> {
    return Array.from(this.products.values()).filter(
      (p) => p.category === category && p.isActive
    );
  }

  async createOrder(input: CreateGiftOrderInput): Promise<GiftOrder> {
    const giftType = input.giftType || "ITEM";
    const merchant = this.merchants.get(input.merchantId);
    if (!merchant) throw new Error("Merchant not found");

    let amount: number;
    let currency: string;
    let productId: string | null = null;
    let creditAmount: number | null = null;

    if (giftType === "CREDIT") {
      if (!input.creditAmount || input.creditAmount <= 0) {
        throw new Error("Credit amount must be positive");
      }
      amount = input.creditAmount;
      creditAmount = input.creditAmount;
      currency = "LBP";
    } else {
      if (!input.productId) throw new Error("Product ID required for ITEM gifts");
      const product = this.products.get(input.productId);
      if (!product) throw new Error("Product not found");
      if (product.merchantId !== input.merchantId) throw new Error("Product does not belong to this merchant");
      amount = product.price;
      currency = product.currency;
      productId = product.id;
    }

    const id = randomUUID();
    const giftToken = randomUUID();
    const redeemCode = generateRedeemCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const order: GiftOrder = {
      id,
      giftType,
      senderName: input.senderName,
      receiverName: input.receiverName,
      receiverContact: input.receiverContact,
      deliveryChannel: input.deliveryChannel,
      productId,
      merchantId: input.merchantId,
      amount,
      creditAmount,
      currency,
      message: input.message,
      themeId: input.themeId,
      status: "PAID",
      giftToken,
      redeemCode,
      createdAt: now.toISOString(),
      scheduledSendAt: input.scheduledSendAt || null,
      sentAt: now.toISOString(),
      redeemedAt: null,
      expiresAt: expiresAt.toISOString(),
    };

    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: string): Promise<GiftOrder | undefined> {
    return this.orders.get(id);
  }

  async getOrderByToken(orderId: string, token: string): Promise<GiftOrder | undefined> {
    const order = this.orders.get(orderId);
    if (order && order.giftToken === token) {
      return order;
    }
    return undefined;
  }

  async redeemOrder(redeemCode: string): Promise<GiftOrder | null> {
    for (const order of this.orders.values()) {
      if (order.redeemCode === redeemCode) {
        if (order.status === "REDEEMED") {
          return null;
        }
        if (order.status === "EXPIRED" || order.status === "CANCELED") {
          return null;
        }
        order.status = "REDEEMED" as GiftOrderStatusType;
        order.redeemedAt = new Date().toISOString();
        return order;
      }
    }
    return null;
  }

  async getOrdersByMerchant(merchantId: string): Promise<GiftOrder[]> {
    return Array.from(this.orders.values()).filter(
      (o) => o.merchantId === merchantId
    );
  }
}

export const storage = new Storage();
