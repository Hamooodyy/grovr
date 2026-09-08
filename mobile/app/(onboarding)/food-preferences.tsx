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

const FOOD_LIKES = [
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "American",
  "Indian",
  "Japanese",
  "Thai",
  "French",
  "Korean",
  "Middle Eastern",
  "Soul Food",
  "Vegetarian",
  "Seafood",
  "BBQ / Grilling",
  "Comfort Food",
] as const;

export default function FoodPreferencesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    household: string;
    frequency: string;
  }>();
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikeText, setDislikeText] = useState("");
  const [dislikes, setDislikes] = useState<string[]>([]);

  function toggleLike(item: string) {
    setLikes((prev) =>
      prev.includes(item) ? prev.filter((l) => l !== item) : [...prev, item]
    );
  }

  function addDislike() {
    const trimmed = dislikeText.trim();
    if (trimmed && !dislikes.includes(trimmed)) {
      setDislikes((prev) => [...prev, trimmed]);
      setDislikeText("");
    }
  }

  function removeDislike(item: string) {
    setDislikes((prev) => prev.filter((d) => d !== item));
  }

  const canContinue = likes.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.step}>Step 2 of 5</Text>
        <Text style={styles.title}>What do you like to eat?</Text>
        <Text style={styles.subtitle}>
          Pick as many as you want. This shapes your recipe recommendations.
        </Text>

        <View style={styles.chips}>
          {FOOD_LIKES.map((item) => (
            <Pressable
              key={item}
              style={[
                styles.chip,
                likes.includes(item) && styles.chipSelected,
              ]}
              onPress={() => toggleLike(item)}
            >
              <Text
                style={[
                  styles.chipText,
                  likes.includes(item) && styles.chipTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.title, { marginTop: 32 }]}>
          Anything you don't eat?
        </Text>
        <Text style={styles.subtitle}>
          Allergies, restrictions, or foods you dislike. (Optional)
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. shellfish, gluten, cilantro"
            placeholderTextColor="#6a7c71"
            value={dislikeText}
            onChangeText={setDislikeText}
            onSubmitEditing={addDislike}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={addDislike}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {dislikes.length > 0 && (
          <View style={styles.chips}>
            {dislikes.map((item) => (
              <Pressable
                key={item}
                style={styles.dislikeChip}
                onPress={() => removeDislike(item)}
              >
                <Text style={styles.dislikeChipText}>{item} ✕</Text>
              </Pressable>
            ))}
          </View>
        )}
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
              pathname: "/(onboarding)/cooking-preferences",
              params: {
                ...params,
                likes: JSON.stringify(likes),
                dislikes: JSON.stringify(dislikes),
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  chipText: {
    fontSize: 14,
    color: "#0e1f14",
  },
  chipTextSelected: {
    color: "#16a34a",
    fontWeight: "600",
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
  dislikeChip: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dislikeChipText: {
    fontSize: 14,
    color: "#dc2626",
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
