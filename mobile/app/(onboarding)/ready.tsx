import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { updateOnboarding } from "../../lib/api";
import { useOnboarding } from "../_layout";

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
    preferredStore: string;
    pantryItems: string;
  }>();

  const [saving, setSaving] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    saveOnboarding();
  }, []);

  async function saveOnboarding() {
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const likes: string[] = JSON.parse(params.likes || "[]");
      const dislikes: string[] = JSON.parse(params.dislikes || "[]");
      const cookingTimes: string[] = JSON.parse(params.cookingTimes || "[]");
      const pantryItems: string[] = JSON.parse(params.pantryItems || "[]");

      const preferences = [
        ...likes.map((p) => ({ preference: p, type: "like" })),
        ...dislikes.map((p) => ({ preference: p, type: "dislike" })),
      ];

      await updateOnboarding(token, {
        householdType: params.household,
        cookingFrequency: params.frequency,
        cookingTimes,
        servingSize: params.servingSize,
        preferredStore: params.preferredStore,
        preferences,
        pantryItems: pantryItems.map((name) => ({
          name,
          category: "other",
        })),
        onboardingDone: true,
      });

      markOnboardingDone();
      setSaving(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
      setSaving(false);
    }
  }

  if (saving) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Setting up your kitchen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              setSaving(true);
              setError("");
              saveOnboarding();
            }}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Grovr is ready to help you cook smarter. We'll personalize recipes
          based on what you told us.
        </Text>
        <Text style={styles.hint}>
          Recipes powered by AI are coming soon — for now, explore your kitchen
          and start building your pantry.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.buttonText}>Go to Grovr</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fdf8",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0e1f14",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6a7c71",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
  loadingText: {
    fontSize: 16,
    color: "#6a7c71",
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 20,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
