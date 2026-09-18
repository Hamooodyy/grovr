import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { OptionRow } from "../../components/OptionRow";
import { StepHeader } from "../../components/StepHeader";

const TIME_OPTIONS = [
  { value: "15_20", label: "15–20 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45_60", label: "45–60 minutes" },
  { value: "depends", label: "Depends on the day" },
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
    <View style={styles.container}>
      <StepHeader step={3} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>What's dinner usually like?</Text>
        <Text style={styles.sub}>Pick all that apply.</Text>

        <View style={styles.list}>
          {TIME_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={times.includes(opt.value)}
              onPress={() => toggleTime(opt.value)}
            />
          ))}
        </View>

        <Text style={[styles.heading, { marginTop: 32 }]}>
          How much do you usually make?
        </Text>

        <View style={styles.grid}>
          {SERVING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setServings(opt.value)}
              style={[styles.card, servings === opt.value && styles.cardSelected]}
            >
              <Text
                style={[
                  styles.cardLabel,
                  servings === opt.value && styles.cardLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          disabled={!canContinue}
          onPress={() => {
            if (!canContinue) return;
            router.push({
              pathname: "/(onboarding)/pantry-setup",
              params: {
                ...params,
                cookingTimes: JSON.stringify(times),
                servingSize: servings,
              },
            });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: layout.onboardingGutter,
    paddingTop: 24,
    paddingBottom: 16,
  },
  heading: {
    ...typ.h3,
    color: colors.text,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral[700],
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  card: {
    width: "47%",
    minHeight: 76,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  cardSelected: {
    backgroundColor: colors.cta[100],
    borderWidth: 2,
    borderColor: colors.cta.DEFAULT,
  },
  cardLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  cardLabelSelected: {
    color: colors.cta[800],
  },
  footer: {
    paddingHorizontal: layout.onboardingGutter,
    paddingBottom: 40,
  },
});
