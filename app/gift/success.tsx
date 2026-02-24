import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

export default function SuccessScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId: string;
    giftToken: string;
    receiverName: string;
    senderName: string;
    productTitle: string;
    merchantName: string;
  }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    checkScale.value = withDelay(
      300,
      withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      )
    );
    opacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const giftUrl = `${getApiUrl()}g/${params.orderId}?t=${params.giftToken}`;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `${params.senderName} sent you a gift from ${params.merchantName}! Open it here: ${giftUrl}`,
        url: giftUrl,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  };

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = encodeURIComponent(
      `Hey ${params.receiverName}! ${params.senderName} sent you a gift from ${params.merchantName}! Open it here: ${giftUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${text}`;
    await Linking.openURL(whatsappUrl);
  };

  const handlePreview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/gift/reveal",
      params: {
        orderId: params.orderId,
        giftToken: params.giftToken,
      },
    });
  };

  const handleCopyLink = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const clipboard = (globalThis as any)?.navigator?.clipboard;
    if (clipboard && Platform.OS === "web") {
      await clipboard.writeText(giftUrl);
      return;
    }
    await Share.share({ message: giftUrl, url: giftUrl });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset + 40,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
        },
      ]}
    >
      <View style={styles.topSection}>
        <Animated.View style={[styles.successCircle, circleStyle]}>
          <Animated.View style={checkStyle}>
            <Ionicons name="checkmark" size={48} color="#FFF" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentStyle]}>
          <Text style={styles.title}>Gift Sent!</Text>
          <Text style={styles.subtitle}>
            Your gift of {params.productTitle} from {params.merchantName} is on
            its way to {params.receiverName}
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, contentStyle]}>
        <Pressable
          onPress={handleWhatsApp}
          style={({ pressed }) => [
            styles.whatsappButton,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
          <Text style={styles.whatsappText}>Share via WhatsApp</Text>
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareButton,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="share-outline" size={20} color={Colors.primary} />
          <Text style={styles.shareText}>Share Gift Link</Text>
        </Pressable>

        <Pressable
          onPress={handleCopyLink}
          style={({ pressed }) => [
            styles.copyButton,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Ionicons name="copy-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.copyText}>Copy Link</Text>
        </Pressable>

        <Pressable
          onPress={handlePreview}
          style={({ pressed }) => [
            styles.previewButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="eye-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.previewText}>Preview Gift</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.dismissAll();
            router.replace("/");
          }}
          style={({ pressed }) => [
            styles.doneButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.doneText}>Back to Home</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  topSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 24,
    gap: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 16,
    borderRadius: 14,
  },
  whatsappText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  shareText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.primary,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textSecondary,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  previewText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  doneButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  doneText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
});
