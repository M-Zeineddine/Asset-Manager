import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";
import { getMerchantSession } from "@/lib/merchant-session";
import type { CreditRedemption, GiftOrder } from "@/shared/schema";

type OrderDetail = {
  order: GiftOrder;
  redemptions: CreditRedemption[];
};

function formatLBP(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function MerchantHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<GiftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const webTopInset = Platform.OS === "web" ? 40 : 0;

  useEffect(() => {
    (async () => {
      const session = await getMerchantSession();
      if (!session) {
        router.replace("/merchant/portal");
        return;
      }
      setToken(session.token);
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/merchant/orders`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = (await res.json()) as GiftOrder[];
      setOrders(data);
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (orderId: string) => {
    if (!token) return;
    if (expandedId === orderId) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(orderId);
    setDetailLoading(true);
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/merchant/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as OrderDetail;
    setExpandedDetail(data);
    setDetailLoading(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 12 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Redemption History</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {orders.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No redemptions yet</Text>
            </View>
          )}

          {orders.map((order) => {
            const isCredit = order.giftType === "CREDIT";
            const remaining = order.creditRemaining ?? order.creditAmount ?? 0;
            const isExpanded = expandedId === order.id;
            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderTitle}>
                      {isCredit ? "Store Credit" : "Item Gift"}
                    </Text>
                    <Text style={styles.orderMeta}>Code: {order.redeemCode}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>

                {isCredit && (
                  <Text style={styles.orderAmount}>
                    Remaining: LBP {formatLBP(remaining)}
                  </Text>
                )}

                <Pressable onPress={() => toggleExpand(order.id)} style={styles.expandButton}>
                  <Text style={styles.expandText}>
                    {isExpanded ? "Hide History" : "View History"}
                  </Text>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
                </Pressable>

                {isExpanded && (
                  <View style={styles.historyBox}>
                    {detailLoading || !expandedDetail ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : isCredit ? (
                      expandedDetail.redemptions.length === 0 ? (
                        <Text style={styles.historyEmpty}>No redemptions yet.</Text>
                      ) : (
                        expandedDetail.redemptions.map((r) => (
                          <View key={r.id} style={styles.historyRow}>
                            <Text style={styles.historyAmount}>LBP {formatLBP(r.amountDeducted)}</Text>
                            <Text style={styles.historyDate}>
                              {new Date(r.deductedAt).toLocaleDateString("en-US")}
                            </Text>
                          </View>
                        ))
                      )
                    ) : expandedDetail.order.redeemedAt ? (
                      <View style={styles.historyRow}>
                        <Text style={styles.historyAmount}>Redeemed</Text>
                        <Text style={styles.historyDate}>
                          {new Date(expandedDetail.order.redeemedAt).toLocaleDateString("en-US")}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.historyEmpty}>Not redeemed yet.</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  orderTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  orderMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(196, 69, 54, 0.1)",
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.primary,
  },
  orderAmount: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.primary,
  },
  historyBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    gap: 8,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyAmount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
  },
  historyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  historyEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
  },
});
