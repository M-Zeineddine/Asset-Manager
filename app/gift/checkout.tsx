import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { paymentProvider } from "@/lib/payment-provider";
import { fetch } from "expo/fetch";
import type { GiftProduct, Merchant, GiftOrder } from "@/shared/schema";

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    giftType?: string;
    productId?: string;
    merchantId: string;
    creditAmount?: string;
    message: string;
    senderName: string;
    receiverName: string;
    receiverContact: string;
    themeId: string;
    deliveryChannel: string;
  }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const isCredit = params.giftType === "CREDIT";
  const creditAmount = params.creditAmount ? parseInt(params.creditAmount, 10) : 0;

  const { data: product } = useQuery<GiftProduct>({
    queryKey: ["product", params.productId],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/products/${params.productId}`);
      return res.json();
    },
    enabled: !isCredit && !!params.productId,
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["merchant", params.merchantId],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchants/${params.merchantId}`);
      return res.json();
    },
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      const amount = isCredit ? creditAmount : (product?.price || 0);
      const currency = isCredit ? "LBP" : (product?.currency || "USD");
      const paymentResult = await paymentProvider.pay({
        amount,
        currency,
        metadata: {
          giftType: params.giftType || "ITEM",
          merchantId: params.merchantId,
        },
      });
      if (!paymentResult.success) {
        throw new Error(paymentResult.errorMessage || "Payment failed");
      }
      const body: any = {
        giftType: params.giftType || "ITEM",
        senderName: params.senderName,
        receiverName: params.receiverName,
        receiverContact: params.receiverContact,
        deliveryChannel: params.deliveryChannel,
        merchantId: params.merchantId,
        message: params.message,
        themeId: params.themeId,
      };
      if (isCredit) {
        body.creditAmount = creditAmount;
        body.productId = null;
      } else {
        body.productId = params.productId;
      }
      const res = await apiRequest("POST", "/api/orders", body);
      return (await res.json()) as GiftOrder;
    },
    onSuccess: (order) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/gift/success",
        params: {
          orderId: order.id,
          giftToken: order.giftToken,
          receiverName: params.receiverName,
          senderName: params.senderName,
          productTitle: isCredit ? `Store Credit - LBP ${formatLBP(creditAmount)}` : (product?.title || ""),
          merchantName: merchant?.name || "",
        },
      });
    },
  });

  const themeColors = (Colors.themes as any)[params.themeId || "celebration"] || Colors.themes.celebration;

  if (!isCredit && !product) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const channelLabel =
    params.deliveryChannel === "whatsapp"
      ? "WhatsApp"
      : params.deliveryChannel === "sms"
      ? "SMS"
      : "Email";

  const displayPrice = isCredit ? `LBP ${formatLBP(creditAmount)}` : `$${product!.price}`;
  const displayTitle = isCredit ? "Store Credit" : product!.title;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Review & Pay</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.giftPreview}>
          <LinearGradient
            colors={themeColors as [string, string, ...string[]]}
            style={styles.giftPreviewGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={isCredit ? "card" : "gift"} size={32} color="rgba(255,255,255,0.9)" />
            <Text style={styles.giftPreviewLabel}>Gift for {params.receiverName}</Text>
            <Text style={styles.giftPreviewMessage} numberOfLines={3}>
              "{params.message}"
            </Text>
            <Text style={styles.giftPreviewFrom}>From {params.senderName}</Text>
          </LinearGradient>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            {isCredit ? (
              <View style={styles.creditIconBox}>
                <Ionicons name="card-outline" size={24} color="#FFF" />
              </View>
            ) : (
              <Image
                source={{ uri: product!.imageUrl }}
                style={styles.summaryImage}
                contentFit="cover"
              />
            )}
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryProductTitle}>{displayTitle}</Text>
              <Text style={styles.summaryMerchant}>{merchant.name}</Text>
            </View>
            <Text style={styles.summaryPrice}>{displayPrice}</Text>
          </View>

          <View style={styles.divider} />

          {isCredit && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>Store Credit</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recipient</Text>
            <Text style={styles.detailValue}>{params.receiverName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery via</Text>
            <Text style={styles.detailValue}>{channelLabel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{params.receiverContact}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Theme</Text>
            <Text style={styles.detailValue}>
              {params.themeId?.charAt(0).toUpperCase()}
              {params.themeId?.slice(1)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{displayPrice}</Text>
          </View>
        </View>

        <View style={styles.mockPaymentNote}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.mockPaymentText}>
            This is a demo. No real payment will be charged.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) },
        ]}
      >
        <Pressable
          onPress={() => orderMutation.mutate()}
          disabled={orderMutation.isPending}
          style={({ pressed }) => [
            styles.payButton,
            pressed && { opacity: 0.9 },
            orderMutation.isPending && { opacity: 0.7 },
          ]}
        >
          {orderMutation.isPending ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#FFF" />
              <Text style={styles.payButtonText}>Pay {displayPrice}</Text>
            </>
          )}
        </Pressable>

        {orderMutation.isError && (
          <Text style={styles.errorText}>
            Something went wrong. Please try again.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  giftPreview: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  giftPreviewGradient: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  giftPreviewLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFF",
    marginTop: 4,
  },
  giftPreviewMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },
  giftPreviewFrom: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  creditIconBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryProductTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  summaryMerchant: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.primary,
  },
  mockPaymentNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(196, 69, 54, 0.06)",
    borderRadius: 10,
  },
  mockPaymentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  payButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#FFF",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginTop: 8,
  },
});
