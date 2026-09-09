import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { OptionRow } from "../../components/OptionRow";
import { StepHeader } from "../../components/StepHeader";

const POPULAR_STORES = [
  "Trader Joe's",
  "Whole Foods",
  "Kroger",
  "Publix",
  "Safeway",
  "Target",
  "Aldi",
  "Costco",
  "Wegmans",
  "Walmart",
] as const;

export default function PreferredStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return POPULAR_STORES;
    const q = query.toLowerCase();
    return POPULAR_STORES.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  const canContinue = !!selected;

  return (
    <View style={styles.container}>
      <StepHeader step={4} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Where do you usually shop?</Text>
        <Text style={styles.sub}>
          Your go-to store. You can change it later.
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search stores"
          placeholderTextColor={colors.neutral[500]}
          style={styles.searchInput}
        />

        <View style={styles.list}>
          {filtered.map((name) => (
            <OptionRow
              key={name}
              label={name}
              selected={selected === name}
              onPress={() => setSelected(name)}
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
              pathname: "/(onboarding)/pantry-setup",
              params: { ...params, preferredStore: selected },
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
  searchInput: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
  },
  list: {
    gap: 10,
  },
  footer: {
    paddingHorizontal: layout.onboardingGutter,
    paddingBottom: 40,
  },
});
