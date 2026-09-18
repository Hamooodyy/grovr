import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, fonts, type as typ, layout } from "../../lib/theme";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Chip";
import { Tag } from "../../components/Tag";
import { PillInput } from "../../components/PillInput";
import { StepHeader } from "../../components/StepHeader";

const FOOD_LIKES = [
  "Chicken",
  "Beef",
  "Seafood",
  "Vegetables",
  "Pasta",
  "Rice",
  "Mexican",
  "Asian",
  "Mediterranean",
  "Italian",
  "Healthy & light",
  "Comfort food",
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

  const canContinue = likes.length > 0;

  return (
    <View style={styles.container}>
      <StepHeader step={2} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>What do you like to eat?</Text>
        <Text style={styles.sub}>
          Pick your favorites.
        </Text>

        <View style={styles.chips}>
          {FOOD_LIKES.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={likes.includes(item)}
              onPress={() => toggleLike(item)}
            />
          ))}
        </View>

        <Text style={[styles.heading, { marginTop: 32 }]}>
          Anything you don't eat?
        </Text>
        <Text style={styles.sub}>
          Allergies, dislikes, whatever. Optional.
        </Text>

        <PillInput
          value={dislikeText}
          onChangeText={setDislikeText}
          onSubmit={addDislike}
          placeholder="e.g. shellfish, gluten, cilantro"
        />

        {dislikes.length > 0 && (
          <View style={styles.dislikeTags}>
            {dislikes.map((item) => (
              <Tag
                key={item}
                label={item}
                variant="accent"
                onRemove={() =>
                  setDislikes((prev) => prev.filter((d) => d !== item))
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue"
          disabled={!canContinue}
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  dislikeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: layout.onboardingGutter,
    paddingBottom: 40,
  },
});
