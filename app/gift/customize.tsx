import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import type { GiftProduct, Merchant, DeliveryChannelType, GiftTypeType } from "@/shared/schema";

const THEMES = [
  { id: "celebration", name: "Celebration", colors: Colors.themes.celebration },
  { id: "elegant", name: "Elegant", colors: Colors.themes.elegant },
  { id: "warmth", name: "Warmth", colors: Colors.themes.warmth },
  { id: "nature", name: "Nature", colors: Colors.themes.nature },
  { id: "romantic", name: "Romantic", colors: Colors.themes.romantic },
];

const CHANNELS: { key: DeliveryChannelType; label: string; icon: string }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
  { key: "sms", label: "SMS", icon: "chatbubble-outline" },
  { key: "email", label: "Email", icon: "mail-outline" },
];

const DEFAULT_CREDIT_PRESETS = [500000, 1000000, 2000000];

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    giftType?: string;
    productId?: string;
    merchantId: string;
    creditAmount?: string;
  }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const giftType: GiftTypeType = (params.giftType as GiftTypeType) || "ITEM";
  const isCredit = giftType === "CREDIT";

  const [creditAmount, setCreditAmount] = useState(
    params.creditAmount ? parseInt(params.creditAmount, 10) : DEFAULT_CREDIT_PRESETS[0]
  );
  const [customCreditInput, setCustomCreditInput] = useState(
    params.creditAmount && !DEFAULT_CREDIT_PRESETS.includes(parseInt(params.creditAmount, 10))
      ? params.creditAmount
      : ""
  );
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverContact, setReceiverContact] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("celebration");
  const [selectedChannel, setSelectedChannel] = useState<DeliveryChannelType>("whatsapp");

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

  const creditEnabled = merchant?.creditIsEnabled ?? true;
  const presetAmounts =
    merchant?.creditPresetAmounts && merchant.creditPresetAmounts.length > 0
      ? merchant.creditPresetAmounts
      : DEFAULT_CREDIT_PRESETS;
  const minAmount = merchant?.creditMinAmount || 0;
  const maxAmount = merchant?.creditMaxAmount || 0;
  const creditInRange =
    !isCredit ||
    (!minAmount || creditAmount >= minAmount) &&
    (!maxAmount || creditAmount <= maxAmount);

  const isValid =
    message.trim() &&
    senderName.trim() &&
    receiverName.trim() &&
    receiverContact.trim() &&
    (isCredit ? creditEnabled && creditAmount > 0 && creditInRange : true);

  const handleContinue = () => {
    if (!isValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/gift/checkout",
      params: {
        giftType,
        productId: isCredit ? "" : (params.productId || ""),
        merchantId: params.merchantId,
        creditAmount: isCredit ? String(creditAmount) : "",
        message,
        senderName,
        receiverName,
        receiverContact,
        themeId: selectedTheme,
        deliveryChannel: selectedChannel,
      },
    });
  };

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

  const contactPlaceholder =
    selectedChannel === "whatsapp"
      ? "+961 XX XXX XXX"
      : selectedChannel === "sms"
      ? "+961 XX XXX XXX"
      : "email@example.com";

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Customize Gift</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isCredit ? (
          <View style={styles.creditPreview}>
            <View style={styles.creditIconBox}>
              <Ionicons name="card-outline" size={28} color="#FFF" />
            </View>
            <View style={styles.creditPreviewInfo}>
              <Text style={styles.creditPreviewTitle}>Store Credit</Text>
              <Text style={styles.creditPreviewMerchant}>{merchant.name}</Text>
              <Text style={styles.creditPreviewAmount}>LBP {formatLBP(creditAmount)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.productPreview}>
            <Image
              source={{ uri: product!.imageUrl }}
              style={styles.previewImage}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{product!.title}</Text>
              <Text style={styles.previewMerchant}>{merchant.name}</Text>
              <Text style={styles.previewPrice}>${product!.price}</Text>
            </View>
          </View>
        )}

        {isCredit && (
          <>
            {!creditEnabled ? (
              <View style={styles.creditDisabled}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.creditDisabledText}>
                  Store credit is not enabled for this merchant.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Credit Amount</Text>
                <View style={styles.creditPillRow}>
                  {presetAmounts.map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCreditAmount(val);
                        setCustomCreditInput("");
                      }}
                      style={[
                        styles.creditPill,
                        creditAmount === val && !customCreditInput && styles.creditPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.creditPillText,
                          creditAmount === val && !customCreditInput && styles.creditPillTextActive,
                        ]}
                      >
                        LBP {formatLBP(val)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.customCreditRow}>
                  <Text style={styles.customCreditLabel}>LBP</Text>
                  <TextInput
                    style={styles.customCreditInput}
                    value={customCreditInput}
                    onChangeText={(text) => {
                      setCustomCreditInput(text);
                      const parsed = parseInt(text.replace(/[^0-9]/g, ""), 10);
                      if (parsed > 0) setCreditAmount(parsed);
                    }}
                    placeholder="Custom amount"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={styles.creditRangeText}>
                  Min LBP {formatLBP(minAmount)} - Max LBP {formatLBP(maxAmount)}
                </Text>
                {!creditInRange && (
                  <Text style={styles.rangeErrorText}>
                    Enter an amount between LBP {formatLBP(minAmount)} and LBP {formatLBP(maxAmount)}
                  </Text>
                )}
                <View style={styles.creditDisclaimer}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.creditDisclaimerText}>
                    Redeemable only at {merchant.name}. Unused balance remains available until expiry.
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={senderName}
          onChangeText={setSenderName}
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Recipient's Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Who is this gift for?"
          value={receiverName}
          onChangeText={setReceiverName}
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.sectionLabel}>Your Message</Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          placeholder="Write a heartfelt message..."
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          placeholderTextColor={Colors.textMuted}
          maxLength={300}
        />
        <Text style={styles.charCount}>{message.length}/300</Text>

        <Text style={styles.sectionLabel}>Card Theme</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
          {THEMES.map((theme) => (
            <Pressable
              key={theme.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedTheme(theme.id);
              }}
              style={[
                styles.themeCard,
                selectedTheme === theme.id && styles.themeCardActive,
              ]}
            >
              <LinearGradient
                colors={theme.colors as [string, string, ...string[]]}
                style={styles.themeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text
                style={[
                  styles.themeName,
                  selectedTheme === theme.id && styles.themeNameActive,
                ]}
              >
                {theme.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Delivery Channel</Text>
        <View style={styles.channelRow}>
          {CHANNELS.map((ch) => (
            <Pressable
              key={ch.key}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedChannel(ch.key);
              }}
              style={[
                styles.channelCard,
                selectedChannel === ch.key && styles.channelCardActive,
              ]}
            >
              <Ionicons
                name={ch.icon as any}
                size={22}
                color={selectedChannel === ch.key ? "#FFF" : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.channelText,
                  selectedChannel === ch.key && styles.channelTextActive,
                ]}
              >
                {ch.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Recipient's Contact</Text>
        <TextInput
          style={styles.input}
          placeholder={contactPlaceholder}
          value={receiverContact}
          onChangeText={setReceiverContact}
          placeholderTextColor={Colors.textMuted}
          keyboardType={selectedChannel === "email" ? "email-address" : "phone-pad"}
        />
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) },
        ]}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.continueButton,
            !isValid && styles.continueButtonDisabled,
            pressed && isValid && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.continueButtonText}>Continue to Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </Pressable>
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
  productPreview: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewImage: {
    width: 80,
    height: 80,
  },
  previewInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  previewTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  previewMerchant: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.primary,
    marginTop: 4,
  },
  creditPreview: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 24,
    padding: 16,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  creditIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  creditPreviewInfo: {
    flex: 1,
  },
  creditPreviewTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  creditPreviewMerchant: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  creditPreviewAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.primary,
    marginTop: 4,
  },
  creditPillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  creditPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  creditPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  creditPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  creditPillTextActive: {
    color: "#FFF",
  },
  creditRangeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  rangeErrorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.error,
    marginBottom: 10,
  },
  creditDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(196, 69, 54, 0.06)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  creditDisclaimerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  creditDisabled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(229, 57, 53, 0.08)",
    marginBottom: 10,
  },
  creditDisabledText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },
  customCreditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  customCreditLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customCreditInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  messageInput: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "right",
    marginTop: -12,
    marginBottom: 16,
  },
  themeScroll: {
    marginBottom: 16,
  },
  themeCard: {
    alignItems: "center",
    marginRight: 12,
    padding: 3,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeCardActive: {
    borderColor: Colors.primary,
  },
  themeGradient: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  themeName: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  themeNameActive: {
    color: Colors.primary,
  },
  channelRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  channelCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  channelCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  channelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  channelTextActive: {
    color: "#FFF",
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
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
});
