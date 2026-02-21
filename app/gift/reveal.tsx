import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import type { GiftOrder, GiftProduct, Merchant } from "@/shared/schema";

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function RevealScreen() {
  const insets = useSafeAreaInsets();
  const { orderId, giftToken } = useLocalSearchParams<{
    orderId: string;
    giftToken: string;
  }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [revealed, setRevealed] = useState(false);

  const envelopeScale = useSharedValue(0.8);
  const envelopeOpacity = useSharedValue(1);
  const cardScale = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const messageOpacity = useSharedValue(0);

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

  useEffect(() => {
    envelopeScale.value = withSpring(1, { damping: 12 });
  }, []);

  const handleReveal = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRevealed(true);
    envelopeScale.value = withTiming(0.5, { duration: 300 });
    envelopeOpacity.value = withTiming(0, { duration: 300 });
    cardScale.value = withDelay(200, withSpring(1, { damping: 10 }));
    cardOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    messageOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  };

  const envelopeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: envelopeScale.value }],
    opacity: envelopeOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  const themeColors = order
    ? ((Colors.themes as any)[order.themeId] || Colors.themes.celebration)
    : Colors.themes.celebration;

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
        <Ionicons name="gift-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFoundTitle}>Gift Not Found</Text>
        <Text style={styles.notFoundText}>
          This gift link may be invalid or expired.
        </Text>
      </View>
    );
  }

  const revealTitle = isCredit
    ? "Store Credit"
    : (product?.title || "Gift");
  const revealSubtitle = isCredit
    ? `LBP ${formatLBP(order.creditAmount || 0)} credit`
    : "";

  return (
    <LinearGradient
      colors={themeColors as [string, string, ...string[]]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + webTopInset + 20,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
          },
        ]}
      >
        {!revealed ? (
          <Animated.View style={[styles.envelopeContainer, envelopeStyle]}>
            <View style={styles.envelopeCard}>
              <Ionicons name="gift" size={64} color={Colors.primary} />
              <Text style={styles.envelopeTitle}>You have a gift!</Text>
              <Text style={styles.envelopeSubtitle}>
                From {order.senderName}
              </Text>

              <Pressable
                onPress={handleReveal}
                style={({ pressed }) => [
                  styles.revealButton,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <Text style={styles.revealButtonText}>Open Gift</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View
          style={[styles.revealedContainer, cardStyle]}
          pointerEvents={revealed ? "auto" : "none"}
        >
          <View style={styles.revealedCard}>
            {isCredit ? (
              <View style={styles.creditRevealHeader}>
                <Ionicons name="card" size={40} color="#FFF" />
                <Text style={styles.creditRevealLabel}>Store Credit</Text>
                <Text style={styles.creditRevealAmount}>
                  LBP {formatLBP(order.creditAmount || 0)}
                </Text>
                <Text style={styles.creditRevealInstruction}>
                  Apply to your bill
                </Text>
              </View>
            ) : (
              product && (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.revealedImage}
                  contentFit="cover"
                  transition={300}
                />
              )
            )}

            <View style={styles.revealedContent}>
              <Text style={styles.revealedProductTitle}>{revealTitle}</Text>
              <Text style={styles.revealedMerchant}>
                {merchant?.name || ""}
              </Text>

              <Animated.View style={[styles.messageBox, messageStyle]}>
                <Text style={styles.messageQuote}>"{order.message}"</Text>
                <Text style={styles.messageFrom}>
                  — {order.senderName}
                </Text>
              </Animated.View>
            </View>
          </View>

          <Animated.View style={messageStyle}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/gift/redeem",
                  params: { orderId, giftToken },
                });
              }}
              style={({ pressed }) => [
                styles.redeemButton,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="qr-code-outline" size={20} color="#FFF" />
              <Text style={styles.redeemButtonText}>Show Redemption Code</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  notFoundTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginTop: 12,
  },
  notFoundText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  envelopeContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 20,
    right: 20,
    top: 0,
    bottom: 0,
  },
  envelopeCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    width: "100%",
  },
  envelopeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
    marginTop: 8,
  },
  envelopeSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  revealButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  revealButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFF",
  },
  revealedContainer: {
    alignItems: "center",
    gap: 20,
  },
  revealedCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    overflow: "hidden",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  revealedImage: {
    width: "100%",
    height: 200,
  },
  creditRevealHeader: {
    backgroundColor: Colors.primary,
    padding: 28,
    alignItems: "center",
    gap: 6,
  },
  creditRevealLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  creditRevealAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#FFF",
  },
  creditRevealInstruction: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  revealedContent: {
    padding: 20,
    alignItems: "center",
  },
  revealedProductTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
  },
  revealedMerchant: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  messageBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(196, 69, 54, 0.06)",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  messageQuote: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 24,
  },
  messageFrom: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  redeemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  redeemButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
});
