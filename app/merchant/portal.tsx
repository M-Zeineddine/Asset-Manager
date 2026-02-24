import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { getMerchantSession, saveMerchantSession } from "@/lib/merchant-session";
import type { MerchantUser } from "@/shared/schema";

export default function MerchantPortalLogin() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const session = await getMerchantSession();
      if (session) {
        router.replace("/merchant/redeem");
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/merchant/login", {
        email: email.trim(),
        password,
      });
      const data = (await res.json()) as { token: string; user: MerchantUser };
      await saveMerchantSession({ token: data.token, user: data.user });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/merchant/redeem");
    } catch (e: any) {
      setError("Invalid credentials. Try the demo login below.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === "web" ? 40 : 20) },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="storefront-outline" size={26} color="#FFF" />
        </View>
        <Text style={styles.title}>Merchant Portal</Text>
        <Text style={styles.subtitle}>Redeem gifts and track credit balances</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Login</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="merchant@shop.com"
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && { opacity: 0.9 },
            loading && { opacity: 0.7 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#FFF" />
              <Text style={styles.loginButtonText}>Login</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>Demo Credentials</Text>
        <Text style={styles.demoText}>owner@cafenazih.com / localtreats</Text>
        <Text style={styles.demoText}>staff@cafenazih.com / localtreats</Text>
        <Text style={styles.demoText}>owner@tawletbyblos.com / localtreats</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.error,
    marginBottom: 8,
  },
  demoCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(196, 69, 54, 0.06)",
    borderRadius: 14,
  },
  demoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  demoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});
