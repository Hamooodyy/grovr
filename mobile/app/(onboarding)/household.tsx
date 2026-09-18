import { useRouter } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { OptionRow } from "../../components/OptionRow";
import { StepHeader } from "../../components/StepHeader";

const HOUSEHOLD_OPTIONS = [
  { value: "just_me", label: "Just me" },
  { value: "plus_one", label: "Me + one" },
  { value: "family", label: "Family" },
  { value: "roommates", label: "Roommates" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Almost every day" },
  { value: "few_times", label: "A few times a week" },
  { value: "once_twice", label: "1–2 times a week" },
  { value: "not_often", label: "Not often" },
] as const;

export default function HouseholdScreen() {
  const router = useRouter();
  const [household, setHousehold] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<string | null>(null);

  const canContinue = household && frequency;

  return (
    <View style={styles.container}>
      <StepHeader step={1} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Who's cooking?</Text>
        <Text style={styles.sub}>So we get the portions right.</Text>

        <View style={styles.grid}>
          {HOUSEHOLD_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setHousehold(opt.value)}
              style={[styles.card, household === opt.value && styles.cardSelected]}
            >
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

        <Text style={[styles.heading, { marginTop: 32 }]}>
          How often do you cook?
        </Text>

        <View style={styles.list}>
          {FREQUENCY_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={frequency === opt.value}
              onPress={() => setFrequency(opt.value)}
            />
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
              pathname: "/(onboarding)/food-preferences",
              params: { household, frequency },
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  list: {
    gap: 10,
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: layout.onboardingGutter,
    paddingBottom: 40,
  },
});
