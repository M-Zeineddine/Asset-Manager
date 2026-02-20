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
  senderName: string;
  receiverName: string;
  receiverContact: string;
  deliveryChannel: DeliveryChannelType;
  productId: string;
  merchantId: string;
  amount: number;
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
  expiresAt: string;
}

export const createGiftOrderSchema = z.object({
  senderName: z.string().min(1),
  receiverName: z.string().min(1),
  receiverContact: z.string().min(1),
  deliveryChannel: z.enum(['whatsapp', 'sms', 'email']),
  productId: z.string().min(1),
  merchantId: z.string().min(1),
  message: z.string().min(1),
  themeId: z.string().default('celebration'),
  scheduledSendAt: z.string().nullable().optional(),
});

export type CreateGiftOrderInput = z.infer<typeof createGiftOrderSchema>;
