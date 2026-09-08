import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";

const COMMON_ITEMS = [
  "Chicken breast",
  "Ground beef",
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
  "Tomatoes",
  "Potatoes",
  "Carrots",
  "Bell peppers",
  "Broccoli",
  "Spinach",
  "Lemons",
  "Flour",
] as const;

const COMMON_SPICES = [
  "Salt",
  "Black pepper",
  "Garlic powder",
  "Onion powder",
  "Cumin",
  "Paprika",
  "Chili powder",
  "Oregano",
  "Basil",
  "Cinnamon",
  "Red pepper flakes",
  "Turmeric",
  "Italian seasoning",
  "Bay leaves",
  "Thyme",
  "Rosemary",
] as const;

const ALL_QUICK_PICKS = [...COMMON_ITEMS, ...COMMON_SPICES];

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.step}>Step 5 of 5</Text>
        <Text style={styles.title}>What's in your kitchen?</Text>
        <Text style={styles.subtitle}>
          Add items you have on hand. This helps us suggest recipes you can make
          right now.
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. chicken, rice, olive oil"
            placeholderTextColor="#6a7c71"
            value={itemText}
            onChangeText={setItemText}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={addItem}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {items.filter((i) => !ALL_QUICK_PICKS.includes(i as never)).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Your items</Text>
            <View style={styles.chips}>
              {items
                .filter((i) => !ALL_QUICK_PICKS.includes(i as never))
                .map((item) => (
                  <Pressable
                    key={item}
                    style={styles.selectedChip}
                    onPress={() => toggleItem(item)}
                  >
                    <Text style={styles.selectedChipText}>{item} ✕</Text>
                  </Pressable>
                ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Common items
        </Text>
        <Text style={styles.sectionHint}>Tap to add what you have</Text>
        <View style={styles.chips}>
          {COMMON_ITEMS.map((item) => (
            <Pressable
              key={item}
              style={[
                styles.spiceChip,
                items.includes(item) && styles.spiceChipSelected,
              ]}
              onPress={() => toggleItem(item)}
            >
              <Text
                style={[
                  styles.spiceChipText,
                  items.includes(item) && styles.spiceChipTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Spices & seasonings
        </Text>
        <View style={styles.chips}>
          {COMMON_SPICES.map((spice) => (
            <Pressable
              key={spice}
              style={[
                styles.spiceChip,
                items.includes(spice) && styles.spiceChipSelected,
              ]}
              onPress={() => toggleItem(spice)}
            >
              <Text
                style={[
                  styles.spiceChipText,
                  items.includes(spice) && styles.spiceChipTextSelected,
                ]}
              >
                {spice}
              </Text>
            </Pressable>
          ))}
        </View>

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No items yet — add what you have, or skip for now.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            {items.length > 0 ? "Continue" : "I'll add items later"}
          </Text>
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
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0e1f14",
  },
  addButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0e1f14",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: "#6a7c71",
    marginBottom: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#16a34a",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedChipText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
  },
  spiceChip: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  spiceChipSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  spiceChipText: {
    fontSize: 14,
    color: "#0e1f14",
  },
  spiceChipTextSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    color: "#6a7c71",
    textAlign: "center",
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
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
