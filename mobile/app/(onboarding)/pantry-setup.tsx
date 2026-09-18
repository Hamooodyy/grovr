import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, fonts, type as typ, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { Tag } from "../../components/Tag";
import { PillInput } from "../../components/PillInput";
import { StepHeader } from "../../components/StepHeader";

const COMMON_ITEMS = [
  "Chicken breast",
  "Eggs",
  "Milk",
  "Butter",
  "Cheese",
  "Rice",
  "Pasta",
  "Bread",
  "Olive oil",
  "Onions",
  "Garlic",
  "Spinach",
  "Lemons",
  "Greek yogurt",
  "Strawberries",
  "Chickpeas",
] as const;

const SPICE_ITEMS = [
  "Salt",
  "Black pepper",
  "Garlic powder",
  "Cumin",
  "Paprika",
  "Oregano",
  "Italian seasoning",
  "Red pepper flakes",
] as const;

const ALL_QUICK_PICKS = [...COMMON_ITEMS, ...SPICE_ITEMS];

export default function PantrySetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [itemText, setItemText] = useState("");
  const [items, setItems] = useState<string[]>([]);

  function toggleItem(item: string) {
    setItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function addItem() {
    const trimmed = itemText.trim();
    if (trimmed && !items.includes(trimmed)) {
      setItems((prev) => [...prev, trimmed]);
      setItemText("");
    }
  }

  const addedCount = items.length;

  function handleContinue() {
    router.push({
      pathname: "/(onboarding)/ready",
      params: {
        ...params,
        pantryItems: JSON.stringify(items),
      },
    });
  }

  return (
    <View style={styles.container}>
      <StepHeader step={4} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>What do you have on hand?</Text>
        <Text style={styles.sub}>
          A handful is plenty — Grovr uses it to make your first recommendations
          real. Half a minute, tops.
        </Text>

        <PillInput
          value={itemText}
          onChangeText={setItemText}
          onSubmit={addItem}
          placeholder="Item name (e.g. chicken breast)"
        />

        {/* Custom items not in quick picks */}
        {items.filter((i) => !ALL_QUICK_PICKS.includes(i as never)).length > 0 && (
          <View style={styles.customTags}>
            {items
              .filter((i) => !ALL_QUICK_PICKS.includes(i as never))
              .map((item) => (
                <Tag
                  key={item}
                  label={item}
                  variant="accent2"
                  onRemove={() => toggleItem(item)}
                />
              ))}
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>COMMON ITEMS</Text>
          {addedCount > 0 && (
            <Tag label={`${addedCount} added`} variant="accent2" />
          )}
        </View>
        <View style={styles.chips}>
          {COMMON_ITEMS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={items.includes(item)}
              onPress={() => toggleItem(item)}
            />
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          SPICES & SEASONINGS
        </Text>
        <View style={styles.chips}>
          {SPICE_ITEMS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={items.includes(item)}
              onPress={() => toggleItem(item)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={items.length > 0 ? "Continue with my pantry" : "I'll add items later"}
          variant={items.length > 0 ? "primary" : "ghost"}
          onPress={handleContinue}
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
  customTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.96,
    color: colors.neutral[600],
    textTransform: "uppercase",
    marginBottom: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  footer: {
    paddingHorizontal: layout.onboardingGutter,
    paddingBottom: 40,
  },
});
