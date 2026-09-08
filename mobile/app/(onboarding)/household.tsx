import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";

const HOUSEHOLD_OPTIONS = [
  { value: "just_me", label: "Just me", icon: "🧑" },
  { value: "plus_one", label: "Me + one", icon: "👫" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "roommates", label: "Roommates", icon: "🏠" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "few_times", label: "A few times a week" },
  { value: "once_twice", label: "Once or twice a week" },
  { value: "not_often", label: "Not very often" },
] as const;

export default function HouseholdScreen() {
  const router = useRouter();
  const [household, setHousehold] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);

  const canContinue = household && frequency;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.step}>Step 1 of 5</Text>
        <Text style={styles.title}>Who's eating?</Text>
        <Text style={styles.subtitle}>
          This helps us tailor portions and recipes.
        </Text>

        <View style={styles.grid}>
          {HOUSEHOLD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.card,
                household === opt.value && styles.cardSelected,
              ]}
              onPress={() => setHousehold(opt.value)}
            >
              <Text style={styles.cardIcon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.cardLabel,
                  household === opt.value && styles.cardLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.title, { marginTop: 32 }]}>
          How often do you cook?
        </Text>

        <View style={styles.list}>
          {FREQUENCY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.listItem,
                frequency === opt.value && styles.listItemSelected,
              ]}
              onPress={() => setFrequency(opt.value)}
            >
              <Text
                style={[
                  styles.listLabel,
                  frequency === opt.value && styles.listLabelSelected,
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
              pathname: "/(onboarding)/food-preferences",
              params: { household, frequency },
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  cardSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0e1f14",
  },
  cardLabelSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  list: {
    gap: 10,
    marginTop: 16,
  },
  listItem: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 16,
  },
  listItemSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  listLabel: {
    fontSize: 16,
    color: "#0e1f14",
  },
  listLabelSelected: {
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
