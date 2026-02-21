import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import type { Merchant, GiftProduct } from "@/shared/schema";

const CREDIT_PRESETS = [
  { label: "LBP 500,000", value: 500000 },
  { label: "LBP 1,000,000", value: 1000000 },
  { label: "LBP 2,000,000", value: 2000000 },
];

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

function StoreCreditSection({ merchant }: { merchant: Merchant }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const handlePreset = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/gift/customize",
      params: { giftType: "CREDIT", merchantId: merchant.id, creditAmount: String(value) },
    });
  };

  const handleCustom = () => {
    const parsed = parseInt(customAmount.replace(/[^0-9]/g, ""), 10);
    if (!parsed || parsed <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/gift/customize",
      params: { giftType: "CREDIT", merchantId: merchant.id, creditAmount: String(parsed) },
    });
  };

  return (
    <View style={styles.creditSection}>
      <View style={styles.creditHeader}>
        <View style={styles.creditIconWrap}>
          <Ionicons name="card-outline" size={20} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.creditTitle}>Store Credit</Text>
          <Text style={styles.creditSubtitle}>Redeemable on anything at {merchant.name}</Text>
        </View>
      </View>

      <View style={styles.presetRow}>
        {CREDIT_PRESETS.map((preset) => (
          <Pressable
            key={preset.value}
            onPress={() => handlePreset(preset.value)}
            style={({ pressed }) => [
              styles.presetPill,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={styles.presetAmount}>LBP {formatLBP(preset.value)}</Text>
            <Ionicons name="gift" size={14} color={Colors.primary} />
          </Pressable>
        ))}
      </View>

      {!showCustom ? (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setShowCustom(true);
          }}
          style={styles.customToggle}
        >
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.customToggleText}>Custom amount</Text>
        </Pressable>
      ) : (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>LBP</Text>
          <TextInput
            style={styles.customInput}
            value={customAmount}
            onChangeText={setCustomAmount}
            placeholder="Enter amount"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            autoFocus
          />
          <Pressable
            onPress={handleCustom}
            disabled={!customAmount || parseInt(customAmount.replace(/[^0-9]/g, ""), 10) <= 0}
            style={({ pressed }) => [
              styles.customSendBtn,
              (!customAmount || parseInt(customAmount.replace(/[^0-9]/g, ""), 10) <= 0) && { opacity: 0.4 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ProductCard({ product, merchant }: { product: GiftProduct; merchant: Merchant }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: "/gift/customize",
          params: { giftType: "ITEM", productId: product.id, merchantId: merchant.id },
        });
      }}
      style={({ pressed }) => [
        styles.productCard,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Image
        source={{ uri: product.imageUrl }}
        style={styles.productImage}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={styles.productDesc} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            ${product.price}
          </Text>
          <View style={styles.giftButton}>
            <Ionicons name="gift" size={14} color="#FFF" />
            <Text style={styles.giftButtonText}>Gift</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function MerchantScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: merchant, isLoading: merchantLoading } = useQuery<Merchant>({
    queryKey: ["merchant", id],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchants/${id}`);
      return res.json();
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery<GiftProduct[]>({
    queryKey: ["products", id],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchants/${id}/products`);
      return res.json();
    },
  });

  if (merchantLoading || productsLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Merchant not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!(products && products.length > 0)}
        ListHeaderComponent={
          <View>
            <View style={styles.coverContainer}>
              <Image
                source={{ uri: merchant.coverUrl }}
                style={[styles.coverImage, { paddingTop: insets.top + webTopInset }]}
                contentFit="cover"
                transition={300}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.3)", "transparent", "rgba(0,0,0,0.5)"]}
                style={StyleSheet.absoluteFill}
              />
              <Pressable
                onPress={() => router.back()}
                style={[styles.backButton, { top: insets.top + webTopInset + 8 }]}
              >
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>
            </View>

            <View style={styles.merchantInfoSection}>
              <Image
                source={{ uri: merchant.logoUrl }}
                style={styles.logo}
                contentFit="cover"
                transition={200}
              />
              <Text style={styles.merchantName}>{merchant.name}</Text>
              <Text style={styles.merchantDesc}>{merchant.description}</Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={16} color={Colors.primary} />
                  <Text style={styles.metaText}>
                    {merchant.area}, {merchant.city}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.metaText}>{merchant.hours}</Text>
                </View>
              </View>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color={Colors.accent} />
                <Text style={styles.ratingValue}>{merchant.rating}</Text>
                <Text style={styles.ratingCount}>
                  ({merchant.reviewCount} reviews)
                </Text>
              </View>
            </View>

            <StoreCreditSection merchant={merchant} />

            <Text style={styles.sectionTitle}>Gift Ideas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard product={item} merchant={merchant} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No gift items available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  coverContainer: {
    height: 220,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  merchantInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: "center",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -48,
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  merchantName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
    marginTop: 12,
    textAlign: "center",
  },
  merchantDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 16,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  ratingValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  ratingCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  creditSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  creditIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  creditTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  creditSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  presetRow: {
    gap: 8,
    marginBottom: 10,
  },
  presetPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetAmount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  customToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  customToggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.primary,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  customLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  customSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 14,
  },
  productRow: {
    gap: 12,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: "100%",
    height: 120,
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  productDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.primary,
  },
  giftButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  giftButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
