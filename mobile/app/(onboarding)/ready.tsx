import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { updateOnboarding } from "../../lib/api";
import { useOnboarding } from "../_layout";
import { colors, fonts, type as typ } from "../../lib/theme";
import { Button } from "../../components/Button";

// Keep the loading screen up long enough to read, even when the save is instant
const MIN_LOADING_MS = 1500;

export default function ReadyScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { markOnboardingDone } = useOnboarding();
  const params = useLocalSearchParams<{
    household: string;
    frequency: string;
    likes: string;
    dislikes: string;
    cookingTimes: string;
    servingSize: string;
  }>();

  const [error, setError] = useState("");

  useEffect(() => {
    run();
  }, []);

  async function run() {
    const startedAt = Date.now();
    try {
      setError("");
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const likes: string[] = JSON.parse(params.likes || "[]");
      const dislikes: string[] = JSON.parse(params.dislikes || "[]");
      const cookingTimes: string[] = JSON.parse(params.cookingTimes || "[]");

      const preferences = [
        ...likes.map((p) => ({ preference: p, type: "like" })),
        ...dislikes.map((p) => ({ preference: p, type: "dislike" })),
      ];

      await updateOnboarding(token, {
        householdType: params.household,
        cookingFrequency: params.frequency,
        cookingTimes,
        servingSize: params.servingSize,
        preferences,
        onboardingDone: true,
      });

      const remaining = MIN_LOADING_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

      markOnboardingDone();
      router.replace("/(tabs)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
    }
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Button title="Try again" onPress={run} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.cta.DEFAULT} />
        <Text style={styles.loadingText}>Setting up your kitchen...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.neutral[700],
  },
  errorTitle: {
    ...typ.h3,
    color: colors.text,
    textAlign: "center",
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cta.DEFAULT,
    textAlign: "center",
  },
});
