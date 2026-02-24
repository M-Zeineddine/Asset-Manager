import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { clearMerchantSession, getMerchantSession } from "@/lib/merchant-session";
import type { CreditRedemption, GiftOrder } from "@/shared/schema";

type LookupResponse = {
  order: GiftOrder;
  redemptions: CreditRedemption[];
};

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function MerchantRedeemScreen() {
  const insets = useSafeAreaInsets();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [error, setError] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const webTopInset = Platform.OS === "web" ? 40 : 0;

  useEffect(() => {
    (async () => {
      const session = await getMerchantSession();
      if (!session) {
        router.replace("/merchant/portal");
        return;
      }
      setSessionToken(session.token);
    })();
  }, []);

  const handleLogout = async () => {
    await clearMerchantSession();
    router.replace("/merchant/portal");
  };

  const handleLookup = async () => {
    if (!code.trim() || !sessionToken) return;
    const normalized = code.trim().toUpperCase();
    setError("");
    setRedeemError("");
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchant/orders/by-code/${normalized}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) {
        throw new Error("Not found");
      }
      const data = (await res.json()) as LookupResponse;
      setLookup(data);
      setRedeemAmount("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setLookup(null);
      setError("Gift not found or not eligible for this merchant.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemItem = async () => {
    if (!lookup || !sessionToken) return;
    setRedeemError("");
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchant/redeem/item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ code: lookup.order.redeemCode }),
      });
      if (!res.ok) throw new Error("Redeem failed");
      const updated = (await res.json()) as GiftOrder;
      setLookup({ order: updated, redemptions: lookup.redemptions });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setRedeemError("Unable to redeem. Check status or try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCredit = async () => {
    if (!lookup || !sessionToken) return;
    const parsed = parseInt(redeemAmount.replace(/[^0-9]/g, ""), 10);
    if (!parsed || parsed <= 0) return;
    const currentRemaining = lookup.order.creditRemaining ?? lookup.order.creditAmount ?? 0;
    if (parsed > currentRemaining) {
      setRedeemError("Amount exceeds remaining balance.");
      return;
    }
    setRedeemError("");
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchant/redeem/credit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          code: lookup.order.redeemCode,
          amountToDeduct: parsed,
        }),
      });
      if (!res.ok) throw new Error("Redeem failed");
      const data = (await res.json()) as { order: GiftOrder; redemption: CreditRedemption };
      setLookup({
        order: data.order,
        redemptions: [...(lookup.redemptions || []), data.redemption],
      });
      setRedeemAmount("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setRedeemError("Unable to deduct that amount.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const remaining = lookup?.order.creditRemaining ?? lookup?.order.creditAmount ?? 0;
  const isCredit = lookup?.order.giftType === "CREDIT";
  const parsedRedeemAmount = parseInt(redeemAmount.replace(/[^0-9]/g, ""), 10);
  const redeemDisabled =
    !parsedRedeemAmount ||
    parsedRedeemAmount <= 0 ||
    parsedRedeemAmount > remaining;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 12 }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Redeem Gifts</Text>
        <View style={styles.topActions}>
          <Pressable onPress={() => router.push("/merchant/history")} style={styles.topButton}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.topButton}>
            <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Enter redemption code</Text>
        <View style={styles.codeRow}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />
          <Pressable onPress={handleLookup} style={styles.lookupButton}>
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.lookupText}>Lookup</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {lookup && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Gift Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>
                {isCredit ? "Store Credit" : "Item Gift"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{lookup.order.status}</Text>
            </View>
            {isCredit && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Remaining</Text>
                <Text style={styles.detailValue}>LBP {formatLBP(remaining)}</Text>
              </View>
            )}

            {lookup.order.status === "REDEEMED" && (
              <View style={styles.statusBanner}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.statusText}>Already redeemed</Text>
              </View>
            )}

            {lookup.order.status === "EXPIRED" && (
              <View style={[styles.statusBanner, styles.statusError]}>
                <Ionicons name="time-outline" size={18} color={Colors.error} />
                <Text style={[styles.statusText, { color: Colors.error }]}>Gift expired</Text>
              </View>
            )}

            {lookup.order.status !== "REDEEMED" && lookup.order.status !== "EXPIRED" && (
              <>
                {isCredit ? (
                  <View style={styles.creditRedeemSection}>
                    <Text style={styles.label}>Amount to deduct</Text>
                    <View style={styles.codeRow}>
                      <TextInput
                        style={styles.codeInput}
                        value={redeemAmount}
                        onChangeText={setRedeemAmount}
                        placeholder="LBP amount"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="number-pad"
                      />
                      <Pressable
                        onPress={handleRedeemCredit}
                        disabled={redeemDisabled}
                        style={[
                          styles.lookupButton,
                          redeemDisabled && { opacity: 0.5 },
                        ]}
                      >
                        <Text style={styles.lookupText}>Deduct</Text>
                      </Pressable>
                    </View>
                    <View style={styles.quickRow}>
                      {[50000, 100000, 250000, 500000].map((val) => (
                      <Pressable
                          key={val}
                          onPress={() => setRedeemAmount(String(val))}
                          style={styles.quickPill}
                        >
                          <Text style={styles.quickText}>LBP {formatLBP(val)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={handleRedeemItem} style={styles.redeemButton}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.redeemText}>Confirm Redeem</Text>
                  </Pressable>
                )}
              </>
            )}

            {redeemError ? <Text style={styles.errorText}>{redeemError}</Text> : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  topButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    letterSpacing: 2,
  },
  lookupButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lookupText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFF",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.error,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.text,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.success,
  },
  statusError: {
    backgroundColor: "rgba(229, 57, 53, 0.08)",
  },
  creditRedeemSection: {
    marginTop: 12,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.text,
  },
  redeemButton: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.success,
    paddingVertical: 12,
    borderRadius: 12,
  },
  redeemText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
  },
});
