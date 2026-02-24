import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MerchantUser } from "@/shared/schema";

const TOKEN_KEY = "merchant_token";
const USER_KEY = "merchant_user";

export type MerchantSession = {
  token: string;
  user: MerchantUser;
};

export async function saveMerchantSession(session: MerchantSession): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, session.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export async function getMerchantSession(): Promise<MerchantSession | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const userRaw = await AsyncStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as MerchantUser;
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearMerchantSession(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}
