import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import type { Merchant } from "@/shared/schema";

const CITIES = ["All", "Beirut", "Byblos", "Jounieh"];
const CATEGORIES = [
  { key: "all", label: "All", icon: "gift-outline" as const },
  { key: "coffee", label: "Coffee", icon: "cafe-outline" as const },
  { key: "dessert", label: "Dessert", icon: "ice-cream-outline" as const },
  { key: "meals", label: "Meals", icon: "restaurant-outline" as const },
  { key: "flowers", label: "Flowers", icon: "flower-outline" as const },
  { key: "wellness", label: "Wellness", icon: "leaf-outline" as const },
];

function CategoryPill({
  item,
  isSelected,
  onPress,
}: {
  item: (typeof CATEGORIES)[0];
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.categoryPill,
        isSelected && styles.categoryPillActive,
      ]}
    >
      <Ionicons
        name={item.icon}
        size={16}
        color={isSelected ? "#FFF" : Colors.textSecondary}
      />
      <Text
        style={[
          styles.categoryPillText,
          isSelected && styles.categoryPillTextActive,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function CityTab({
  city,
  isSelected,
  onPress,
}: {
  city: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.cityTab, isSelected && styles.cityTabActive]}
    >
      <Text
        style={[
          styles.cityTabText,
          isSelected && styles.cityTabTextActive,
        ]}
      >
        {city}
      </Text>
    </Pressable>
  );
}

function MerchantCard({ merchant }: { merchant: Merchant }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/merchant/${merchant.id}`);
      }}
      style={({ pressed }) => [
        styles.merchantCard,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <Image
        source={{ uri: merchant.coverUrl }}
        style={styles.merchantCover}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.merchantGradient}
      />
      <View style={styles.merchantInfo}>
        <View style={styles.merchantHeader}>
          <Image
            source={{ uri: merchant.logoUrl }}
            style={styles.merchantLogo}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.merchantText}>
            <Text style={styles.merchantName}>{merchant.name}</Text>
            <View style={styles.merchantMeta}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.merchantLocation}>
                {merchant.area}, {merchant.city}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.merchantRating}>
          <Ionicons name="star" size={14} color={Colors.accent} />
          <Text style={styles.ratingText}>{merchant.rating}</Text>
          <Text style={styles.reviewText}>({merchant.reviewCount})</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: merchants, isLoading, refetch } = useQuery<Merchant[]>({
    queryKey: [
      "merchants",
      selectedCity,
      selectedCategory,
    ],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const params = new URLSearchParams();
      if (selectedCity !== "All") params.set("city", selectedCity);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      const url = `${baseUrl}api/merchants?${params.toString()}`;
      const res = await fetch(url);
      return res.json();
    },
  });

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Send a gift to Lebanon</Text>
          <Text style={styles.headerTitle}>LocalTreats</Text>
        </View>
        <Pressable style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="gift-outline"
            size={28}
            color={Colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.cityRow}>
        {CITIES.map((city) => (
          <CityTab
            key={city}
            city={city}
            isSelected={selectedCity === city}
            onPress={() => setSelectedCity(city)}
          />
        ))}
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.categoriesContainer}
        renderItem={({ item }) => (
          <CategoryPill
            item={item}
            isSelected={selectedCategory === item.key}
            onPress={() => setSelectedCategory(item.key)}
          />
        )}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={merchants || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.merchantList,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(merchants && merchants.length > 0)}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => <MerchantCard merchant={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No merchants found</Text>
              <Text style={styles.emptySubtext}>
                Try changing your city or category filter
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(196, 69, 54, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cityRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  cityTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  cityTabActive: {
    backgroundColor: Colors.primary,
  },
  cityTabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cityTabTextActive: {
    color: "#FFFFFF",
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  merchantList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  merchantCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    height: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  merchantCover: {
    width: "100%",
    height: "100%",
  },
  merchantGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  merchantInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  merchantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  merchantLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  merchantText: {
    flex: 1,
  },
  merchantName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  merchantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  merchantLocation: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  merchantRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  ratingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  reviewText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
