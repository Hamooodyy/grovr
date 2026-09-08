import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";

const TIME_OPTIONS = [
  { value: "15_20", label: "Quick — under 20 min", icon: "⚡" },
  { value: "30", label: "Medium — about 30 min", icon: "🍳" },
  { value: "enjoy", label: "I enjoy cooking — 45-60 min", icon: "👨‍🍳" },
  { value: "depends", label: "Depends on the day", icon: "🤷" },
] as const;

const SERVING_OPTIONS = [
  { value: "1", label: "1 serving" },
  { value: "2", label: "2 servings" },
  { value: "3_4", label: "3–4 servings" },
  { value: "5_plus", label: "5+ servings" },
] as const;

export default function CookingPreferencesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    household: string;
    frequency: string;
    likes: string;
    dislikes: string;
  }>();
  const [times, setTimes] = useState<string[]>([]);
  const [servings, setServings] = useState<string | null>(null);

  function toggleTime(value: string) {
    setTimes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  const canContinue = times.length > 0 && servings;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.step}>Step 3 of 5</Text>
        <Text style={styles.title}>How do you like to cook?</Text>
        <Text style={styles.subtitle}>
          Pick all the cook times that work for you.
        </Text>

        <View style={styles.list}>
          {TIME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.listItem,
                times.includes(opt.value) && styles.listItemSelected,
              ]}
              onPress={() => toggleTime(opt.value)}
            >
              <Text style={styles.listIcon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.listLabel,
                  times.includes(opt.value) && styles.listLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.title, { marginTop: 32 }]}>
          How many servings?
        </Text>
        <Text style={styles.subtitle}>
          We'll size recipes to match.
        </Text>

        <View style={styles.servingGrid}>
          {SERVING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.servingCard,
                servings === opt.value && styles.servingCardSelected,
              ]}
              onPress={() => setServings(opt.value)}
            >
              <Text
                style={[
                  styles.servingLabel,
                  servings === opt.value && styles.servingLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canContinue && styles.buttonDisabled,
            pressed && canContinue && { opacity: 0.7 },
          ]}
          onPress={() => {
            if (!canContinue) return;
            router.push({
              pathname: "/(onboarding)/preferred-store",
              params: {
                ...params,
                cookingTimes: JSON.stringify(times),
                servingSize: servings,
              },
            });
          }}
          disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    color: "#16a34a",
    fontWeight: "500",
  },
  step: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0e1f14",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6a7c71",
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  listItemSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  listIcon: {
    fontSize: 22,
  },
  listLabel: {
    fontSize: 16,
    color: "#0e1f14",
  },
  listLabelSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  servingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  servingCard: {
    width: "47%",
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  servingCardSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  servingLabel: {
    fontSize: 15,
    color: "#0e1f14",
    fontWeight: "500",
  },
  servingLabelSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
