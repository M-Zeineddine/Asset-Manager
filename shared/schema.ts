import { z } from "zod";

export const GiftOrderStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  SENT: 'SENT',
  REDEEMED: 'REDEEMED',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED',
} as const;

export type GiftOrderStatusType = typeof GiftOrderStatus[keyof typeof GiftOrderStatus];

export const DeliveryChannel = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
} as const;

export type DeliveryChannelType = typeof DeliveryChannel[keyof typeof DeliveryChannel];

export const Category = {
  COFFEE: 'coffee',
  DESSERT: 'dessert',
  MEALS: 'meals',
  FLOWERS: 'flowers',
  WELLNESS: 'wellness',
} as const;

export type CategoryType = typeof Category[keyof typeof Category];

export const GiftType = {
  ITEM: 'ITEM',
  CREDIT: 'CREDIT',
} as const;

export type GiftTypeType = typeof GiftType[keyof typeof GiftType];

export interface Merchant {
  id: string;
  name: string;
  description: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  hours: string;
  logoUrl: string;
  coverUrl: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  creditMinAmount: number;
  creditMaxAmount: number;
  creditPresetAmounts: number[];
  creditIsEnabled: boolean;
}

export interface GiftProduct {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  category: CategoryType;
  isActive: boolean;
  substitutionPolicy: string;
}

export interface GiftOrder {
  id: string;
  giftType: GiftTypeType;
  senderName: string;
  receiverName: string;
  receiverContact: string;
  deliveryChannel: DeliveryChannelType;
  productId: string | null;
  merchantId: string;
  amount: number;
  creditAmount: number | null;
  creditRemaining: number | null;
  currency: string;
  message: string;
  themeId: string;
  status: GiftOrderStatusType;
  giftToken: string;
  redeemCode: string;
  createdAt: string;
  scheduledSendAt: string | null;
  sentAt: string | null;
  redeemedAt: string | null;
  redeemedByMerchantUserId: string | null;
  expiresAt: string;
}

export interface CreditRedemption {
  id: string;
  amountDeducted: number;
  deductedAt: string;
  merchantUserId: string;
  notes?: string | null;
}

export type MerchantRoleType = "owner" | "staff";

export interface MerchantUser {
  id: string;
  merchantId: string;
  role: MerchantRoleType;
  email: string;
  isActive: boolean;
}

export const createGiftOrderSchema = z.object({
  giftType: z.enum(['ITEM', 'CREDIT']).default('ITEM'),
  senderName: z.string().min(1),
  receiverName: z.string().min(1),
  receiverContact: z.string().min(1),
  deliveryChannel: z.enum(['whatsapp', 'sms', 'email']),
  productId: z.string().nullable().optional(),
  merchantId: z.string().min(1),
  message: z.string().min(1),
  themeId: z.string().default('celebration'),
  creditAmount: z.number().positive().nullable().optional(),
  scheduledSendAt: z.string().nullable().optional(),
});

export type CreateGiftOrderInput = z.infer<typeof createGiftOrderSchema>;
