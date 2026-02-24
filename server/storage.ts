import { randomUUID } from "crypto";
import type {
  Merchant,
  GiftProduct,
  GiftOrder,
  CreateGiftOrderInput,
  GiftOrderStatusType,
  CreditRedemption,
  MerchantUser,
} from "../shared/schema";
import { merchants as seedMerchants, giftProducts as seedProducts, merchantUsers as seedMerchantUsers } from "./seed-data";

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
  private creditRedemptions: Map<string, CreditRedemption[]> = new Map();
  private merchantUsers: Map<string, MerchantUser & { password: string }> = new Map();
  private merchantSessions: Map<string, MerchantUser> = new Map();

  constructor() {
    for (const m of seedMerchants) {
      this.merchants.set(m.id, m);
    }
    for (const p of seedProducts) {
      this.products.set(p.id, p);
    }
    for (const u of seedMerchantUsers) {
      this.merchantUsers.set(u.id, u);
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
    let creditRemaining: number | null = null;

    if (giftType === "CREDIT") {
      if (!merchant.creditIsEnabled) {
        throw new Error("Store credit is not enabled for this merchant");
      }
      if (!input.creditAmount || input.creditAmount <= 0) {
        throw new Error("Credit amount must be positive");
      }
      if (input.creditAmount < merchant.creditMinAmount || input.creditAmount > merchant.creditMaxAmount) {
        throw new Error("Credit amount is outside the allowed range");
      }
      amount = input.creditAmount;
      creditAmount = input.creditAmount;
      creditRemaining = input.creditAmount;
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
      creditRemaining,
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
      redeemedByMerchantUserId: null,
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
    const normalized = redeemCode.trim().toUpperCase();
    for (const order of this.orders.values()) {
      if (order.redeemCode === normalized) {
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

  async authenticateMerchant(email: string, password: string): Promise<MerchantUser | null> {
    for (const user of this.merchantUsers.values()) {
      if (user.email.toLowerCase() === email.toLowerCase() && user.password === password) {
        if (!user.isActive) return null;
        const { password: _pw, ...publicUser } = user;
        return publicUser;
      }
    }
    return null;
  }

  async createMerchantSession(user: MerchantUser): Promise<string> {
    const token = randomUUID();
    this.merchantSessions.set(token, user);
    return token;
  }

  async getMerchantUserByToken(token: string): Promise<MerchantUser | null> {
    return this.merchantSessions.get(token) || null;
  }

  async findOrderByRedeemCode(redeemCode: string): Promise<GiftOrder | null> {
    const normalized = redeemCode.trim().toUpperCase();
    for (const order of this.orders.values()) {
      if (order.redeemCode === normalized) {
        return order;
      }
    }
    return null;
  }

  async getCreditRedemptions(orderId: string): Promise<CreditRedemption[]> {
    return this.creditRedemptions.get(orderId) || [];
  }

  async redeemItemOrder(redeemCode: string, merchantUserId: string): Promise<GiftOrder | null> {
    const order = await this.findOrderByRedeemCode(redeemCode);
    if (!order) return null;
    if (order.giftType !== "ITEM") return null;
    if (order.status === "REDEEMED" || order.status === "EXPIRED" || order.status === "CANCELED") {
      return null;
    }
    order.status = "REDEEMED" as GiftOrderStatusType;
    order.redeemedAt = new Date().toISOString();
    order.redeemedByMerchantUserId = merchantUserId;
    return order;
  }

  async redeemCreditOrder(
    redeemCode: string,
    amountToDeduct: number,
    merchantUserId: string
  ): Promise<{ order: GiftOrder; redemption: CreditRedemption } | null> {
    const order = await this.findOrderByRedeemCode(redeemCode);
    if (!order) return null;
    if (order.giftType !== "CREDIT") return null;
    if (order.status === "REDEEMED" || order.status === "EXPIRED" || order.status === "CANCELED") {
      return null;
    }
    if (order.creditRemaining == null) {
      order.creditRemaining = order.creditAmount || 0;
    }
    if (!order.creditRemaining || order.creditRemaining <= 0) return null;
    if (!amountToDeduct || amountToDeduct <= 0) return null;
    if (amountToDeduct > order.creditRemaining) return null;

    const redemption: CreditRedemption = {
      id: randomUUID(),
      amountDeducted: amountToDeduct,
      deductedAt: new Date().toISOString(),
      merchantUserId,
      notes: null,
    };

    const existing = this.creditRedemptions.get(order.id) || [];
    existing.push(redemption);
    this.creditRedemptions.set(order.id, existing);

    order.creditRemaining = Math.max(0, order.creditRemaining - amountToDeduct);

    if (order.creditRemaining === 0) {
      order.status = "REDEEMED" as GiftOrderStatusType;
      order.redeemedAt = new Date().toISOString();
      order.redeemedByMerchantUserId = merchantUserId;
    }

    return { order, redemption };
  }
}

export const storage = new Storage();
