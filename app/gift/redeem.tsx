import React from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import type { GiftOrder, GiftProduct, Merchant } from "@/shared/schema";

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function RedeemScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, giftToken } = useLocalSearchParams<{
    orderId: string;
    giftToken: string;
  }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: order, isLoading } = useQuery<GiftOrder>({
    queryKey: ["order", orderId, giftToken],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/orders/${orderId}?t=${giftToken}`);
      if (!res.ok) throw new Error("Gift not found");
      return res.json();
    },
  });

  const isCredit = order?.giftType === "CREDIT";

  const { data: product } = useQuery<GiftProduct>({
    queryKey: ["product", order?.productId],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/products/${order!.productId}`);
      return res.json();
    },
    enabled: !!order && !isCredit && !!order.productId,
  });

  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["merchant", order?.merchantId],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchants/${order!.merchantId}`);
      return res.json();
    },
    enabled: !!order,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Gift Not Found</Text>
      </View>
    );
  }

  const isRedeemed = order.status === "REDEEMED";
  const isExpired = order.status === "EXPIRED";

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Redeem Gift</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isRedeemed && (
          <View style={styles.statusBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.statusText}>This gift has been redeemed</Text>
          </View>
        )}

        {isExpired && (
          <View style={[styles.statusBanner, { backgroundColor: "rgba(229, 57, 53, 0.08)" }]}>
            <Ionicons name="time-outline" size={20} color={Colors.error} />
            <Text style={[styles.statusText, { color: Colors.error }]}>
              This gift has expired
            </Text>
          </View>
        )}

        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={order.redeemCode}
              size={180}
              color={Colors.text}
              backgroundColor="transparent"
            />
          </View>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Redemption Code</Text>
            <Text style={styles.codeValue}>{order.redeemCode}</Text>
          </View>

          <Text style={styles.instructions}>
            Show this code to the merchant staff to redeem your gift
          </Text>
        </View>

        <View style={styles.giftDetails}>
          {isCredit ? (
            <View style={styles.creditInfoSection}>
              <View style={styles.creditIconBox}>
                <Ionicons name="card" size={28} color="#FFF" />
              </View>
              <View style={styles.creditInfoText}>
                <Text style={styles.giftTitle}>Store Credit</Text>
                <Text style={styles.giftMerchant}>{merchant?.name || ""}</Text>
                <Text style={styles.creditAmountText}>
                  LBP {formatLBP(order.creditAmount || 0)}
                </Text>
              </View>
            </View>
          ) : (
            product && merchant && (
              <View style={styles.giftRow}>
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.giftImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.giftInfo}>
                  <Text style={styles.giftTitle}>{product.title}</Text>
                  <Text style={styles.giftMerchant}>{merchant.name}</Text>
                  <Text style={styles.giftPrice}>${product.price}</Text>
                </View>
              </View>
            )
          )}

          {isCredit && (
            <>
              <View style={styles.divider} />
              <View style={styles.creditNote}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.creditNoteText}>
                  This is a one-time use store credit. Present this code to apply the full amount to your bill.
                </Text>
              </View>
            </>
          )}

          {merchant && (
            <>
              <View style={styles.divider} />
              <View style={styles.merchantDetails}>
                <Text style={styles.merchantDetailsTitle}>Merchant Info</Text>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoText}>{merchant.address}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoText}>{merchant.hours}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color={Colors.primary} />
                  <Text style={styles.infoText}>{merchant.phone}</Text>
                </View>
              </View>
            </>
          )}

          {!isCredit && product?.substitutionPolicy && (
            <>
              <View style={styles.divider} />
              <View style={styles.policySection}>
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.accent} />
                <View style={styles.policyContent}>
                  <Text style={styles.policyTitle}>Substitution Policy</Text>
                  <Text style={styles.policyText}>
                    {product.substitutionPolicy}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.expiryRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.expiryText}>
              Expires {new Date(order.expiresAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>
      </ScrollView>
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
    gap: 8,
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.success,
  },
  errorTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginTop: 12,
  },
  qrContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 20,
  },
  codeContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  codeLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  codeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: Colors.text,
    letterSpacing: 4,
  },
  instructions: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  giftDetails: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  giftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  giftImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  giftInfo: {
    flex: 1,
  },
  giftTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  giftMerchant: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  giftPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.primary,
    marginTop: 4,
  },
  creditInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  creditIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  creditInfoText: {
    flex: 1,
  },
  creditAmountText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.primary,
    marginTop: 4,
  },
  creditNote: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(196, 69, 54, 0.04)",
    padding: 12,
    borderRadius: 10,
  },
  creditNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  merchantDetails: {
    gap: 10,
  },
  merchantDetailsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  policySection: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  policyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expiryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
});
